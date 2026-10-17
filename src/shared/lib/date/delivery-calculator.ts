/**
 * Расчет срока доставки в календарных днях от момента сбора
 * В соответствии с ТЗ: сегодня — 0, завтра — 1, послезавтра — 2.
 * Если время доставки time1 отсутствует или некорректно — возвращается null (никаких вымышленных данных).
 */
export function calculateDeliveryDays(
  time1Hours: number | null | undefined,
  collectionDate: Date = new Date()
): number | null {
  if (time1Hours == null || isNaN(time1Hours) || time1Hours < 0) {
    return null;
  }

  // Расчетное время доставки: момент сбора + time1 часов
  const deliveryTimeMs = collectionDate.getTime() + time1Hours * 60 * 60 * 1000;
  const deliveryDate = new Date(deliveryTimeMs);

  // Календарный день сбора (в 00:00:00 локального времени)
  const collectionCalendarDay = new Date(
    collectionDate.getFullYear(),
    collectionDate.getMonth(),
    collectionDate.getDate()
  );

  // Календарный день доставки (в 00:00:00 локального времени)
  const deliveryCalendarDay = new Date(
    deliveryDate.getFullYear(),
    deliveryDate.getMonth(),
    deliveryDate.getDate()
  );

  // Разница в полных сутках между календарными датами
  const diffTimeMs = deliveryCalendarDay.getTime() - collectionCalendarDay.getTime();
  const diffDays = Math.round(diffTimeMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
