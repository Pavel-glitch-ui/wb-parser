'use server';

import { getQueriesList } from '@/entities/search-query/model/query.server';
import { SearchQueryDto } from '@/entities/search-query';
import { getProductsForQuery } from '@/entities/product/model/product.server';
import { ProductDto } from '@/entities/product';
import {
  getSerpChartHistory,
  getLatestSerpTable,
} from '@/entities/serp-observation/model/observation.server';
import {
  SerpChartPoint,
  SerpTableItemDto,
  CollectionSummaryDto,
} from '@/entities/serp-observation';
import { executeSerpCollection } from '@/features/trigger-collection/model/collect-serp.server';

export async function fetchQueriesAction(): Promise<SearchQueryDto[]> {
  return await getQueriesList();
}

export async function fetchProductsForQueryAction(queryId: number): Promise<ProductDto[]> {
  return await getProductsForQuery(queryId);
}

export async function fetchChartHistoryAction(
  queryId: number,
  nmIds: string[]
): Promise<SerpChartPoint[]> {
  return await getSerpChartHistory(queryId, nmIds);
}

export async function fetchLatestTableAction(queryId: number): Promise<SerpTableItemDto[]> {
  return await getLatestSerpTable(queryId);
}

export async function triggerCollectionAction(): Promise<CollectionSummaryDto> {
  return await executeSerpCollection();
}
