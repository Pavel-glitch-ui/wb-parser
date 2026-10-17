export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWbCronScheduler } = await import('@/shared/lib/scheduler/wb-cron');
    initWbCronScheduler();
  }
}
