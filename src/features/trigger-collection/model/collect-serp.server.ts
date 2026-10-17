import { prisma, initializeSqliteWalMode } from '@/shared/db';
import { wbSearchClient } from '@/shared/api/wb';
import { SERP_CONFIG } from '@/shared/config';
import { seedQueriesIfEmpty } from '@/entities/search-query/model/query.server';
import { saveQueryObservations } from '@/entities/serp-observation/model/observation.server';
import { CollectionSummaryDto } from '@/entities/serp-observation';

/**
 * Выполнить полный цикл сбора поисковой выдачи по всем 70 запросам
 * Вызывается планировщиком каждый час или вручную по кнопке в интерфейсе
 */
export async function executeSerpCollection(
  topN: number = SERP_CONFIG.DEFAULT_TOP_N,
  dest: string = SERP_CONFIG.DEFAULT_DEST
): Promise<CollectionSummaryDto> {
  await initializeSqliteWalMode();
  await seedQueriesIfEmpty();

  const collectedAt = new Date();

  // 1. Создаем запись о запуске сбора
  const snapshot = await prisma.collectionSnapshot.create({
    data: {
      collectedAt,
      status: 'IN_PROGRESS',
      itemsCount: 0,
    },
  });

  // 2. Получаем все 70 запросов
  const queries = await prisma.searchQuery.findMany({
    orderBy: { id: 'asc' },
  });

  let totalItemsSaved = 0;
  let queriesProcessed = 0;
  let errorsCount = 0;

  console.log(`[WB-COLLECTOR] Запуск сбора #${snapshot.id} для ${queries.length} запросов...`);

  // 3. Последовательно обходим каждый запрос
  for (const query of queries) {
    try {
      console.log(`[WB-COLLECTOR] [${queriesProcessed + 1}/${queries.length}] Сбор: "${query.phrase}"...`);
      const result = await wbSearchClient.fetchSerp(query.phrase, topN, dest, collectedAt);

      if (result.isOk()) {
        const items = result.value;
        if (items.length > 0) {
          await saveQueryObservations(snapshot.id, query.id, items, collectedAt);
          totalItemsSaved += items.length;
        }
        queriesProcessed++;
      } else {
        console.error(`[WB-COLLECTOR] Ошибка сбора для "${query.phrase}":`, result.error.message);
        errorsCount++;
      }
    } catch (err: any) {
      console.error(`[WB-COLLECTOR] Критическая ошибка по запросу "${query.phrase}":`, err);
      errorsCount++;
    }

    // Пауза между запросами для предотвращения 429 блокировок по IP
    await new Promise((resolve) => setTimeout(resolve, SERP_CONFIG.REQUEST_DELAY_MS));
  }

  // 4. Обновляем статус сессии сбора
  const finalStatus = errorsCount === 0 ? 'COMPLETED' : queriesProcessed > 0 ? 'PARTIAL' : 'FAILED';
  
  await prisma.collectionSnapshot.update({
    where: { id: snapshot.id },
    data: {
      status: finalStatus,
      itemsCount: totalItemsSaved,
    },
  });

  console.log(
    `[WB-COLLECTOR] Сбор #${snapshot.id} завершен со статусом ${finalStatus}. Сохранено ${totalItemsSaved} позиций.`
  );

  return {
    snapshotId: snapshot.id,
    collectedAt: collectedAt.toISOString(),
    itemsCount: totalItemsSaved,
    queriesProcessed,
    errorsCount,
  };
}
