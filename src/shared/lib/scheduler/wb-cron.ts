import cron from 'node-cron';
import { executeSerpCollection } from '@/features/trigger-collection/model/collect-serp.server';

let isTaskRunning = false;
let isSchedulerInitialized = false;

/**
 * Инициализация фонового планировщика сбора каждый час
 * Расписание cron: '0 * * * *' (в начале каждого часа)
 */
export function initWbCronScheduler(): void {
  if (isSchedulerInitialized) {
    return;
  }

  isSchedulerInitialized = true;
  console.log('[WB-CRON] Инициализация планировщика сбора (каждый час)...');

  cron.schedule('0 * * * *', async () => {
    if (isTaskRunning) {
      console.warn('[WB-CRON] Предыдущий запуск сбора еще выполняется, пропуск...');
      return;
    }

    try {
      isTaskRunning = true;
      console.log(`[WB-CRON] [${new Date().toISOString()}] Старт планового ежечасного сбора...`);
      await executeSerpCollection();
      console.log(`[WB-CRON] [${new Date().toISOString()}] Ежечасный сбор успешно завершен.`);
    } catch (error) {
      console.error('[WB-CRON] Ошибка при плановом сборе:', error);
    } finally {
      isTaskRunning = false;
    }
  });

  console.log('[WB-CRON] Планировщик активен.');
}
