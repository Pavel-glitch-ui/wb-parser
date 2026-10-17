import 'dotenv/config';

export const SERP_CONFIG = {
  /** Фиксированная глубина сбора выдачи по ТЗ */
  DEFAULT_TOP_N: 200,
  /** Количество товаров на одну страницу выдачи WB */
  PAGE_SIZE: 100,
  /** Гео-код Москвы для сопоставимости цен и доставки по ТЗ */
  DEFAULT_DEST: '-1257786',
  /** Эндпоинт поисковой выдачи Wildberries */
  WB_SEARCH_URL: 'https://search.wb.ru/exactmatch/ru/common/v9/search',
  /** Валюта */
  CURRENCY: 'rub',
  /** Пауза между страницами/запросами для аккуратного пейсинга (мс) */
  REQUEST_DELAY_MS: 500,
  /** Максимальное количество попыток при сетевых сбоях */
  MAX_RETRIES: 3,
  /** Сессионная Cookie из браузера для авторизации в WBAAS */
  WB_COOKIE: process.env.WB_COOKIE || '',
  /** Опциональный прокси */
  WB_PROXY: process.env.WB_PROXY || '',
} as const;
