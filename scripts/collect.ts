import { executeSerpCollection } from '../src/features/trigger-collection/model/collect-serp.server';

async function main() {
  console.log('--- [CLI] Запуск сбора поисковой выдачи Wildberries (70 запросов, топ-200) ---');
  const startTime = Date.now();

  try {
    const summary = await executeSerpCollection();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`--- [CLI] Успешно завершено за ${duration}с! Сохранено ${summary.itemsCount} записей. ---`);
    process.exit(0);
  } catch (err) {
    console.error('--- [CLI] Ошибка выполнения сбора:', err);
    process.exit(1);
  }
}

main();
