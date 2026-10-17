import { ResultAsync, okAsync, errAsync, ok, err } from 'neverthrow';
import { SERP_CONFIG } from '../../config/serp.config';
import { calculateDeliveryDays } from '../../lib/date/delivery-calculator';
import {
  NormalizedSerpItem,
  WbProductItem,
  WbSearchResponseSchema,
} from './wb-search.schemas';

export class WbNetworkError extends Error {
  readonly _tag = 'WbNetworkError';
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WbNetworkError';
  }
}

export class WbHttpError extends Error {
  readonly _tag = 'WbHttpError';
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'WbHttpError';
  }
}

export class WbParseError extends Error {
  readonly _tag = 'WbParseError';
  constructor(message: string, public readonly issues?: unknown) {
    super(message);
    this.name = 'WbParseError';
  }
}

export type WbClientError = WbNetworkError | WbHttpError | WbParseError;

/**
 * Выполнение HTTP GET запроса без браузера
 * Аналог requests.get в Python (как в скрипте Тимура) через нативный fetch Node.js
 */
async function fetchWbJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers,
      signal: controller.signal,
    };

    // Чистый нативный fetch без тяжелых внешних зависимостей

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new WbHttpError(
        response.status,
        `WB API вернул статус ${response.status} (${response.statusText || 'Error'})`
      );
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof WbHttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new WbNetworkError(`Ошибка сети при запросе к WB: ${message}`, err);
  } finally {
    clearTimeout(timeoutId);
  }
}

export class WbSearchClient {
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Запрос одной страницы поисковой выдачи WB
   * Параметры полностью согласованы с рабочим скриптом каталога WB:
   * appType=1, dest=-1257786, locale=ru, sort=popular, spp=0
   */
  public fetchPage(
    query: string,
    page: number,
    dest: string = SERP_CONFIG.DEFAULT_DEST
  ): ResultAsync<WbProductItem[], WbClientError> {
    const searchParams = new URLSearchParams({
      appType: '1',
      curr: SERP_CONFIG.CURRENCY,
      dest,
      locale: 'ru',
      page: String(page),
      query,
      resultset: 'catalog',
      sort: 'popular',
      spp: '0',
      suppressSpellcheck: 'false',
    });

    const candidateUrls = [
      SERP_CONFIG.WB_SEARCH_URL,
      ...SERP_CONFIG.WB_SEARCH_FALLBACK_URLS,
    ];

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0)',
      Accept: '*/*',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Origin: 'https://www.wildberries.ru',
      Referer: `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`,
      'x-requested-with': 'XMLHttpRequest',
    };

    if (SERP_CONFIG.WB_COOKIE && SERP_CONFIG.WB_COOKIE.trim().length > 0) {
      headers['Cookie'] = SERP_CONFIG.WB_COOKIE.trim();
    }

    return ResultAsync.fromPromise(
      (async () => {
        let lastError: Error | null = null;

        for (const baseUrl of candidateUrls) {
          const url = `${baseUrl}?${searchParams.toString()}`;
          try {
            const data = await fetchWbJson(url, headers);
            return data;
          } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
            // Если ошибка 403 / 498, пробуем следующий эндпоинт из цепочки
            continue;
          }
        }

        throw lastError || new Error('Все эндпоинты WB вернули ошибку');
      })(),
      (err): WbClientError => {
        if (err instanceof WbHttpError || err instanceof WbNetworkError || err instanceof WbParseError) {
          return err;
        }
        return new WbNetworkError(err instanceof Error ? err.message : String(err), err);
      }
    ).andThen((data): ResultAsync<WbProductItem[], WbClientError> => {
      const parsed = WbSearchResponseSchema.safeParse(data);
      if (!parsed.success) {
        return errAsync(
          new WbParseError(`Ошибка валидации схемы ответа WB: ${parsed.error.message}`, parsed.error)
        );
      }
      return okAsync(parsed.data.data?.products ?? []);
    });
  }

  /**
   * Сбор реальной поисковой выдачи по запросу до глубины topN
   */
  public fetchSerp(
    query: string,
    topN: number = SERP_CONFIG.DEFAULT_TOP_N,
    dest: string = SERP_CONFIG.DEFAULT_DEST,
    collectionDate: Date = new Date()
  ): ResultAsync<NormalizedSerpItem[], WbClientError> {
    const pagesCount = Math.ceil(topN / SERP_CONFIG.PAGE_SIZE);

    return ResultAsync.fromPromise(
      (async () => {
        const allRawProducts: WbProductItem[] = [];

        for (let page = 1; page <= pagesCount; page++) {
          const pageResult = await this.fetchPage(query, page, dest);
          if (pageResult.isErr()) {
            return err<WbProductItem[], WbClientError>(pageResult.error);
          }

          const products = pageResult.value;
          allRawProducts.push(...products);

          if (products.length === 0 || allRawProducts.length >= topN) {
            break;
          }

          await this.delay(SERP_CONFIG.REQUEST_DELAY_MS);
        }

        return ok<WbProductItem[], WbClientError>(allRawProducts);
      })(),
      (e): WbClientError => (e instanceof Error ? new WbNetworkError(e.message, e) : new WbNetworkError(String(e)))
    ).andThen((wrappedResult) => {
      return wrappedResult.map((rawProducts) => {
        const sliced = rawProducts.slice(0, topN);

        const normalized: NormalizedSerpItem[] = sliced.map((item, index) => {
          // Вычисление цены в рублях (аналогично логике парсера Тимура: sizes[0].price.product / 100)
          let price: number | null = null;
          if (item.sizes && item.sizes.length > 0 && item.sizes[0]?.price?.product != null) {
            price = item.sizes[0].price.product / 100;
          } else if (item.salePriceU != null && item.salePriceU > 0) {
            price = item.salePriceU / 100;
          } else if (item.sizes && item.sizes.length > 0 && item.sizes[0]?.price?.total != null) {
            price = item.sizes[0].price.total / 100;
          } else if (item.priceU != null && item.priceU > 0) {
            price = item.priceU / 100;
          }

          const rating = item.reviewRating ?? item.rating ?? null;
          const feedbacks = item.feedbacks ?? null;
          const deliveryDays = calculateDeliveryDays(item.time1, collectionDate);
          const sellerName = item.supplier ?? item.brand ?? null;

          return {
            nmId: BigInt(item.id),
            name: item.name ?? null,
            brand: item.brand ?? null,
            position: index + 1,
            price,
            rating: rating != null ? Number(rating) : null,
            feedbacks: feedbacks != null ? Number(feedbacks) : null,
            deliveryDays,
            sellerName: sellerName ? String(sellerName).trim() : null,
          };
        });

        return normalized;
      });
    });
  }
}

export const wbSearchClient = new WbSearchClient();
