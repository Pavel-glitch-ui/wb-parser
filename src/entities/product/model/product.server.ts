import { prisma, initializeSqliteWalMode } from '@/shared/db';
import { ProductDto } from './product.types';

/**
 * Получить все товары, когда-либо найденные по заданному поисковому запросу со строгой типизацией
 */
export async function getProductsForQuery(queryId: number): Promise<ProductDto[]> {
  await initializeSqliteWalMode();

  // Находим все уникальные nmId в наблюдениях этого запроса
  const distinctNmIds = await prisma.serpObservation.findMany({
    where: { queryId },
    distinct: ['nmId'],
    select: { nmId: true },
  });

  if (distinctNmIds.length === 0) {
    return [];
  }

  const nmIdsList: bigint[] = distinctNmIds.map((item: { nmId: bigint }) => item.nmId);

  // Получаем метаданные товаров с последним наблюдением и агрегаты одним запросом (без N+1)
  const [products, aggregates] = await Promise.all([
    prisma.product.findMany({
      where: { nmId: { in: nmIdsList } },
      include: {
        observations: {
          where: { queryId },
          orderBy: { collectedAt: 'desc' },
          take: 1,
          select: { position: true, price: true },
        },
      },
    }),
    prisma.serpObservation.groupBy({
      by: ['nmId'],
      where: { queryId, nmId: { in: nmIdsList } },
      _min: { position: true },
      _count: { id: true },
    }),
  ]);

  const aggMap = new Map<string, { minPos: number | null; count: number }>();
  for (const agg of aggregates) {
    aggMap.set(agg.nmId.toString(), {
      minPos: agg._min.position ?? null,
      count: agg._count.id,
    });
  }

  const result: ProductDto[] = products.map((prod) => {
    const nmIdStr = prod.nmId.toString();
    const agg = aggMap.get(nmIdStr);
    const lastObs = prod.observations[0];

    return {
      nmId: nmIdStr,
      name: prod.name,
      brand: prod.brand,
      bestPosition: agg?.minPos ?? null,
      lastPosition: lastObs?.position ?? null,
      latestPrice: lastObs?.price ?? null,
      observationsCount: agg?.count ?? 0,
    };
  });

  // Сортируем: сначала те, у кого лучшая позиция выше (меньше число)
  result.sort((a, b) => (a.bestPosition ?? 999) - (b.bestPosition ?? 999));

  return result;
}
