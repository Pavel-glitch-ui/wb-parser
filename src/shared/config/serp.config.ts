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
  /** Пауза между запросами для предотвращения 429 (мс) */
  REQUEST_DELAY_MS: 300,
  /** Максимальное количество попыток при сетевых сбоях */
  MAX_RETRIES: 3,
} as const;
