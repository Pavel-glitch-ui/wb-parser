import { prisma, initializeSqliteWalMode } from '@/shared/db';
import queriesData from '../../../../data/queries.json';
import { SearchQueryDto } from './query.types';

/**
 * Инициализирует 70 запросов из queries.json в базе данных, если таблица пуста
 */
export async function seedQueriesIfEmpty(): Promise<number> {
  await initializeSqliteWalMode();

  const count = await prisma.searchQuery.count();
  if (count > 0) {
    return count;
  }

  // Загружаем 70 запросов
  const dataToInsert = (queriesData as string[]).map((phrase) => ({
    phrase: phrase.trim(),
  }));

  await prisma.searchQuery.createMany({
    data: dataToInsert,
  });

  return dataToInsert.length;
}

async function fetchQueriesWithLastObservation() {
  return prisma.searchQuery.findMany({
    orderBy: { id: 'asc' },
    include: {
      observations: {
        orderBy: { collectedAt: 'desc' },
        take: 1,
        select: { collectedAt: true },
      },
      _count: {
        select: { observations: true },
      },
    },
  });
}

type QueryWithMeta = Awaited<ReturnType<typeof fetchQueriesWithLastObservation>>[number];

function toSearchQueryDto(q: QueryWithMeta): SearchQueryDto {
  return {
    id: q.id,
    phrase: q.phrase,
    createdAt: q.createdAt.toISOString(),
    lastCollectedAt: q.observations[0]?.collectedAt.toISOString() ?? null,
    observationsCount: q._count.observations,
  };
}

/**
 * Получить список всех запросов с датой последнего сбора со строгой типизацией DTO
 */
export async function getQueriesList(): Promise<SearchQueryDto[]> {
  await initializeSqliteWalMode();
  await seedQueriesIfEmpty();

  const queries = await fetchQueriesWithLastObservation();
  return queries.map(toSearchQueryDto);
}
