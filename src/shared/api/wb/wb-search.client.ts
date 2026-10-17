import axios, { AxiosInstance } from 'axios';
import { ResultAsync, ok, err } from 'neverthrow';
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

function mapAxiosError(e: unknown): WbClientError {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    if (status) {
      return new WbHttpError(status, `WB API HTTP ${status}: ${e.message}`);
    }
    return new WbNetworkError(`WB сетевая ошибка: ${e.message}`, e);
  }
  return new WbNetworkError(e instanceof Error ? e.message : String(e), e);
}

export class WbSearchClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: SERP_CONFIG.WB_SEARCH_URL,
      timeout: 10000,
      proxy: false,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.wildberries.ru/',
        Origin: 'https://www.wildberries.ru',
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Запрос одной страницы поисковой выдачи WB с чистым ResultAsync (без try/catch и throw)
   */
  public fetchPage(
    query: string,
    page: number,
    dest: string = SERP_CONFIG.DEFAULT_DEST
  ): ResultAsync<WbProductItem[], WbClientError> {
    return ResultAsync.fromPromise(
      this.http.get('', {
        params: {
          query,
          resultset: 'catalog',
          limit: SERP_CONFIG.PAGE_SIZE,
          page,
          dest,
          curr: SERP_CONFIG.CURRENCY,
          lang: 'ru',
          suppressSpellcheck: 'false',
        },
      }),
      mapAxiosError
    ).andThen((response) => {
      const parsed = WbSearchResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        return err(
          new WbParseError(`Ошибка валидации ответа WB: ${parsed.error.message}`, parsed.error)
        );
      }
      return ok(parsed.data.data?.products ?? []);
    });
  }

  /**
   * Сбор поисковой выдачи по запросу до глубины topN через идиоматичный neverthrow
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
      (e) => (e instanceof Error ? new WbNetworkError(e.message, e) : new WbNetworkError(String(e)))
    ).andThen((wrappedResult) => {
      return wrappedResult.map((rawProducts) => {
        const sliced = rawProducts.slice(0, topN);

        const normalized: NormalizedSerpItem[] = sliced.map((item, index) => {
          let price: number | null = null;
          if (item.salePriceU != null && item.salePriceU > 0) {
            price = item.salePriceU / 100;
          } else if (item.sizes && item.sizes.length > 0 && item.sizes[0]?.price?.total) {
            price = item.sizes[0].price.total / 100;
          } else if (item.priceU != null && item.priceU > 0) {
            price = item.priceU / 100;
          }

          const rating = item.rating ?? item.reviewRating ?? null;
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
