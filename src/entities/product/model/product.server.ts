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

  // Получаем метаданные товаров с последним наблюдением
  const products = await prisma.product.findMany({
    where: { nmId: { in: nmIdsList } },
    include: {
      observations: {
        where: { queryId },
        orderBy: { collectedAt: 'desc' },
        take: 1,
        select: { position: true, price: true },
      },
    },
  });

  const result: ProductDto[] = [];

  for (const prod of products) {
    const minPosAggregate = await prisma.serpObservation.aggregate({
      where: { queryId, nmId: prod.nmId },
      _min: { position: true },
      _count: { id: true },
    });

    const lastObs = prod.observations[0];

    result.push({
      nmId: prod.nmId.toString(),
      name: prod.name,
      brand: prod.brand,
      bestPosition: minPosAggregate._min.position ?? null,
      lastPosition: lastObs?.position ?? null,
      latestPrice: lastObs?.price ?? null,
      observationsCount: minPosAggregate._count.id,
    });
  }

  // Сортируем: сначала те, у кого лучшая позиция выше (меньше число)
  result.sort((a, b) => (a.bestPosition ?? 999) - (b.bestPosition ?? 999));

  return result;
}
