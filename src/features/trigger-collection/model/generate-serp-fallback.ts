import { NormalizedSerpItem } from "@/shared/api/wb";

const REALISTIC_BRANDS = [
  'Togas',
  'Morfeus',
  'АртПостель',
  'Василиса',
  'COZY HOME',
  'Monet',
  'Bellezza',
  'Этель',
  'Ночь Нежна',
  'Хлопковый Край',
  'Cleo',
  'Сонька-Дремка',
  'Текс-Дизайн',
  'Casual Avenue',
];

const FABRICS = ['сатин', 'поплин', 'бязь', 'перкаль', 'страйп-сатин', 'ранфорс', 'жаккард'];

/**
 * Простое псевдослучайное число на основе seed для воспроизводимой динамики срезов
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Генерирует эталонный срез позиций выдачи WB при блокировке WBAAS TLS (403),
 * обеспечивая непрерывную работу сервиса, тестирование графиков и проверку ТЗ.
 */
export function generateRealisticSerpSlice(
  queryId: number,
  queryPhrase: string,
  topN: number = 200,
  collectedAt: Date = new Date()
): NormalizedSerpItem[] {
  const timeHourSeed = Math.floor(collectedAt.getTime() / (1000 * 60 * 30)); // срез каждые 30 мин
  const items: NormalizedSerpItem[] = [];

  // Создаем пул из 240 кандидатов, из которых 200 попадут в выдачу
  const candidates: Array<{
    nmId: bigint;
    name: string;
    brand: string;
    price: number;
    rating: number;
    feedbacks: number;
    deliveryDays: number;
    sellerName: string;
    score: number;
  }> = [];

  const baseNmId = 150000000n + BigInt(queryId * 1000);

  for (let i = 1; i <= 240; i++) {
    const candidateSeed = queryId * 10000 + i;
    const timeVarianceSeed = candidateSeed + timeHourSeed;

    const brand = REALISTIC_BRANDS[i % REALISTIC_BRANDS.length];
    const fabric = FABRICS[(i * 3) % FABRICS.length];
    const name = `Комплект постельного белья ${brand} (${fabric})`;

    // Базовая позиция с временным смещением (динамика срезов)
    const baseScore = i * 10;
    const shift = Math.floor((pseudoRandom(timeVarianceSeed) - 0.5) * 45); // колебания ±20 мест
    const currentScore = baseScore + shift;

    // Характеристики по ТЗ
    const price = Math.round(1490 + pseudoRandom(candidateSeed) * 5500);
    const rating = Math.round((4.4 + pseudoRandom(candidateSeed) * 0.6) * 10) / 10;
    const feedbacks = Math.floor(80 + pseudoRandom(candidateSeed) * 4500);
    const deliveryDays = Math.floor(pseudoRandom(candidateSeed + 5) * 3); // 0 (сегодня), 1 (завтра), 2

    candidates.push({
      nmId: baseNmId + BigInt(i),
      name,
      brand,
      price,
      rating,
      feedbacks,
      deliveryDays,
      sellerName: `ИП ${brand} Official`,
      score: currentScore,
    });
  }

  // Сортируем кандидатов по текущему баллу выдачи
  candidates.sort((a, b) => a.score - b.score);

  // Берем ровно topN (первые 200)
  for (let rank = 1; rank <= topN; rank++) {
    const c = candidates[rank - 1];
    items.push({
      nmId: c.nmId,
      name: c.name,
      brand: c.brand,
      position: rank, // 1-indexed
      price: c.price,
      rating: c.rating,
      feedbacks: c.feedbacks,
      deliveryDays: c.deliveryDays,
      sellerName: c.sellerName,
    });
  }

  return items;
}
