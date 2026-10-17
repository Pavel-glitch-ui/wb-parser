export interface SearchQueryDto {
  id: number;
  phrase: string;
  createdAt: string;
  lastCollectedAt: string | null;
  observationsCount: number;
}
