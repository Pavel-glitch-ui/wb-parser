import { prisma, initializeSqliteWalMode } from '@/shared/db';
import { NormalizedSerpItem } from '@/shared/api/wb';
import { SerpChartPoint, SerpTableItemDto } from './observation.types';

/**
 * Получить историю позиций для выбранных товаров по запросу для графика
 * В строгом соответствии с ТЗ: если товар не найден в сборе — значение null (без вымышленных позиций)
 */
export async function getSerpChartHistory(
  queryId: number,
  nmIds: string[]
): Promise<SerpChartPoint[]> {
  await initializeSqliteWalMode();

  if (nmIds.length === 0) {
    return [];
  }

  const bigIntNmIds = nmIds.map((id) => BigInt(id));

  // 1. Находим все временные срезы (distinct collectedAt) для данного запроса
  const allRuns = await prisma.serpObservation.findMany({
    where: { queryId },
    distinct: ['collectedAt'],
    select: { collectedAt: true },
    orderBy: { collectedAt: 'asc' },
  });

  if (allRuns.length === 0) {
    return [];
  }

  // 2. Получаем все наблюдения для выбранных товаров по этому запросу
  const observations = await prisma.serpObservation.findMany({
    where: {
      queryId,
      nmId: { in: bigIntNmIds },
    },
    select: {
      nmId: true,
      position: true,
      price: true,
      collectedAt: true,
    },
  });

  // 3. Индексируем наблюдения: Map<"timeISO_nmId", position>
  const obsMap = new Map<string, number>();
  for (const obs of observations) {
    const key = `${obs.collectedAt.toISOString()}_${obs.nmId.toString()}`;
    obsMap.set(key, obs.position);
  }

  // 4. Формируем непрерывную шкалу точек для графика
  const chartPoints: SerpChartPoint[] = allRuns.map((run) => {
    const timeIso = run.collectedAt.toISOString();
    const dateObj = new Date(run.collectedAt);

    // Форматирование для читаемости на оси X: "ДД.ММ ЧЧ:ММ"
    const displayTime = `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    const point: SerpChartPoint = {
      collectedAt: timeIso,
      displayTime,
    };

    // Заполняем позиции выбранных товаров
    for (const nmId of nmIds) {
      const key = `${timeIso}_${nmId}`;
      const pos = obsMap.get(key);
      // Если товар не найден в этом сборе — передаем null! Никаких 201 или 0!
      point[nmId] = pos !== undefined ? pos : null;
    }

    return point;
  });

  return chartPoints;
}

async function fetchLatestTableItems(queryId: number, latestCollectedAt: Date) {
  return prisma.serpObservation.findMany({
    where: {
      queryId,
      collectedAt: latestCollectedAt,
    },
    orderBy: { position: 'asc' },
    include: {
      product: {
        select: { name: true, brand: true },
      },
    },
  });
}

type RawTableObservation = Awaited<ReturnType<typeof fetchLatestTableItems>>[number];

function toSerpTableItemDto(item: RawTableObservation): SerpTableItemDto {
  return {
    id: item.id,
    nmId: item.nmId.toString(),
    name: item.product?.name ?? null,
    brand: item.product?.brand ?? null,
    position: item.position,
    price: item.price,
    rating: item.rating,
    feedbacks: item.feedbacks,
    deliveryDays: item.deliveryDays,
    sellerName: item.sellerName,
    collectedAt: item.collectedAt.toISOString(),
  };
}

/**
 * Получить последнюю собранную таблицу характеристик для выбранного запроса со строгой типизацией
 */
export async function getLatestSerpTable(queryId: number): Promise<SerpTableItemDto[]> {
  await initializeSqliteWalMode();

  const latestObs = await prisma.serpObservation.findFirst({
    where: { queryId },
    orderBy: { collectedAt: 'desc' },
    select: { collectedAt: true },
  });

  if (!latestObs) {
    return [];
  }

  const items = await fetchLatestTableItems(queryId, latestObs.collectedAt);
  return items.map(toSerpTableItemDto);
}

/**
 * Сохранить результаты сбора по запросу в рамках снапшота
 */
export async function saveQueryObservations(
  snapshotId: number,
  queryId: number,
  items: NormalizedSerpItem[],
  collectedAt: Date
): Promise<void> {
  await initializeSqliteWalMode();

  // 1. Апсерт товаров в справочник products (чтобы сохранить название и бренд)
  for (const item of items) {
    await prisma.product.upsert({
      where: { nmId: item.nmId },
      update: {
        name: item.name ?? undefined,
        brand: item.brand ?? undefined,
      },
      create: {
        nmId: item.nmId,
        name: item.name,
        brand: item.brand,
        firstSeenAt: collectedAt,
      },
    });
  }

  // 2. Создаем записи наблюдений
  const observationsData = items.map((item) => ({
    snapshotId,
    queryId,
    nmId: item.nmId,
    position: item.position,
    price: item.price,
    rating: item.rating,
    feedbacks: item.feedbacks,
    deliveryDays: item.deliveryDays,
    sellerName: item.sellerName,
    collectedAt,
  }));

  await prisma.serpObservation.createMany({
    data: observationsData,
  });
}
