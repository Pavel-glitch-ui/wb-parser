export interface SerpChartPoint {
  collectedAt: string; // ISO string
  displayTime: string; // Отформатированное локальное время "DD.MM HH:mm"
  // Динамические ключи вида [nmId]: number | null
  [key: string]: string | number | null;
}

export interface SerpTableItemDto {
  id: number;
  nmId: string;
  name: string | null;
  brand: string | null;
  position: number;
  price: number | null;
  rating: number | null;
  feedbacks: number | null;
  deliveryDays: number | null;
  sellerName: string | null;
  collectedAt: string;
}

export interface CollectionSummaryDto {
  snapshotId: number;
  collectedAt: string;
  itemsCount: number;
  queriesProcessed: number;
  errorsCount: number;
}
