import { prisma, initializeSqliteWalMode } from '@/shared/db';
import { wbSearchClient } from '@/shared/api/wb';
import { SERP_CONFIG } from '@/shared/config';
import { seedQueriesIfEmpty } from '@/entities/search-query/model/query.server';
import { saveQueryObservations } from '@/entities/serp-observation/model/observation.server';
import { CollectionSummaryDto } from '@/entities/serp-observation';

/**
 * Выполнить полный цикл сбора реальной поисковой выдачи по 70 запросам Wildberries
 * Без искусственных вымышленных данных — строго по ТЗ
 */
export async function executeSerpCollection(
  topN: number = SERP_CONFIG.DEFAULT_TOP_N,
  dest: string = SERP_CONFIG.DEFAULT_DEST
): Promise<CollectionSummaryDto> {
  await initializeSqliteWalMode();
  await seedQueriesIfEmpty();

  const collectedAt = new Date();

  // 1. Создаем запись о запуске сессии сбора
  const snapshot = await prisma.collectionSnapshot.create({
    data: {
      collectedAt,
      status: 'IN_PROGRESS',
      itemsCount: 0,
    },
  });

  // 2. Получаем все 70 запросов из базы данных
  const queries = await prisma.searchQuery.findMany({
    orderBy: { id: 'asc' },
  });

  let totalItemsSaved = 0;
  let queriesProcessed = 0;
  let errorsCount = 0;

  console.log(`[WB-COLLECTOR] Запуск сессии сбора #${snapshot.id} (${queries.length} поисковых запросов)...`);
  if (!SERP_CONFIG.WB_COOKIE) {
    console.warn(
      `[WB-COLLECTOR] Предупреждение: переменная WB_COOKIE в файле .env пуста. Если сервер вернет 403/498, добавьте Cookie из браузера.`
    );
  }

  // 3. Последовательно опрашиваем Wildberries по каждому запросу
  for (const query of queries) {
    try {
      console.log(`[WB-COLLECTOR] [${queriesProcessed + errorsCount + 1}/${queries.length}] Запрос: "${query.phrase}"...`);
      const result = await wbSearchClient.fetchSerp(query.phrase, topN, dest, collectedAt);

      if (result.isOk()) {
        const items = result.value;
        if (items.length > 0) {
          await saveQueryObservations(snapshot.id, query.id, items, collectedAt);
          totalItemsSaved += items.length;
          console.log(`   -> Успешно: сохранено ${items.length} реальных товаров WB.`);
        } else {
          console.log(`   -> Внимание: пустая выдача по запросу.`);
        }
        queriesProcessed++;
      } else {
        console.error(`[WB-COLLECTOR] Ошибка по запросу "${query.phrase}":`, result.error.message);
        errorsCount++;
      }
    } catch (err: any) {
      console.error(`[WB-COLLECTOR] Непредвиденный сбой по запросу "${query.phrase}":`, err);
      errorsCount++;
    }

    // Пауза между запросами (pacing)
    await new Promise((resolve) => setTimeout(resolve, SERP_CONFIG.REQUEST_DELAY_MS));
  }

  // 4. Обновляем статус сессии сбора
  const finalStatus =
    errorsCount === 0 ? 'COMPLETED' : queriesProcessed > 0 ? 'PARTIAL' : 'FAILED';

  await prisma.collectionSnapshot.update({
    where: { id: snapshot.id },
    data: {
      status: finalStatus,
      itemsCount: totalItemsSaved,
    },
  });

  console.log(
    `[WB-COLLECTOR] Сессия #${snapshot.id} завершена со статусом ${finalStatus}. Сохранено ${totalItemsSaved} реальных позиций WB.`
  );

  return {
    snapshotId: snapshot.id,
    collectedAt: collectedAt.toISOString(),
    itemsCount: totalItemsSaved,
    queriesProcessed,
    errorsCount,
  };
}
