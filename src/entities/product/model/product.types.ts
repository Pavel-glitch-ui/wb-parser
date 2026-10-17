export interface ProductDto {
  nmId: string; // Строковое представление BigInt для безопасной передачи на клиент
  name: string | null;
  brand: string | null;
  bestPosition: number | null;
  lastPosition: number | null;
  latestPrice: number | null;
  observationsCount: number;
}
