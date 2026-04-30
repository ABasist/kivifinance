const MONTHS = [
  { key: 1, label: 'Січень' },
  { key: 2, label: 'Лютий' },
  { key: 3, label: 'Березень' },
  { key: 4, label: 'Квітень' },
  { key: 5, label: 'Травень' },
  { key: 6, label: 'Червень' },
  { key: 7, label: 'Липень' },
  { key: 8, label: 'Серпень' },
  { key: 9, label: 'Вересень' },
  { key: 10, label: 'Жовтень' },
  { key: 11, label: 'Листопад' },
  { key: 12, label: 'Грудень' }
];

const DEFAULT_MONTH_WEIGHTS = {
  1: 6,
  2: 6,
  3: 8,
  4: 8,
  5: 8,
  6: 7,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  11: 11,
  12: 12
};

const DEFAULT_WEEK_WEIGHTS = {
  1: 25,
  2: 25,
  3: 25,
  4: 25,
  5: 0
};

const DEFAULT_STORES = [
  { id: 1, region: 'Київ', name: 'ТРЦ Lavina', storeCoeff: 1.2, hasPromoter: true, promoterCoeff: 1.25 },
  { id: 2, region: 'Київ', name: 'ТРЦ Retroville', storeCoeff: 1.05, hasPromoter: true, promoterCoeff: 1.2 },
  { id: 3, region: 'Центр', name: 'Черкаси Центр', storeCoeff: 1, hasPromoter: false, promoterCoeff: 1 },
  { id: 4, region: 'Південь', name: 'Одеса Рівʼєра', storeCoeff: 1.15, hasPromoter: true, promoterCoeff: 1.2 },
  { id: 5, region: 'Захід', name: 'Львів Forum', storeCoeff: 1.1, hasPromoter: true, promoterCoeff: 1.2 },
  { id: 6, region: 'Схід', name: 'Дніпро Міст', storeCoeff: 0.95, hasPromoter: false, promoterCoeff: 1 }
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWeights(weights) {
  const entries = Object.entries(weights).map(([key, value]) => [key, Math.max(0, toNumber(value, 0))]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= 0) {
    const equal = 100 / entries.length;
    return Object.fromEntries(entries.map(([key]) => [key, equal]));
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, (value / total) * 100]));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function distributeTarget({
  totalGoal,
  monthWeights,
  weekWeights,
  regionCoefficients,
  stores
}) {
  const safeTotalGoal = Math.max(0, toNumber(totalGoal));
  const normalizedMonths = normalizeWeights(monthWeights);
  const normalizedWeeks = normalizeWeights(weekWeights);

  const rows = [];

  MONTHS.forEach((month) => {
    const monthTarget = safeTotalGoal * (normalizedMonths[month.key] || 0) / 100;

    Object.keys(normalizedWeeks).forEach((weekKey) => {
      const weekTarget = monthTarget * normalizedWeeks[weekKey] / 100;

      const weightedStores = stores.map((store) => {
        const regionCoeff = Math.max(0, toNumber(regionCoefficients[store.region], 1));
        const storeCoeff = Math.max(0, toNumber(store.storeCoeff, 1));
        const promoterCoeff = store.hasPromoter
          ? Math.max(0, toNumber(store.promoterCoeff, 1))
          : 1;

        return {
          ...store,
          score: regionCoeff * storeCoeff * promoterCoeff
        };
      });

      const scoreTotal = weightedStores.reduce((sum, store) => sum + store.score, 0);

      weightedStores.forEach((store) => {
        const share = scoreTotal > 0 ? store.score / scoreTotal : 0;
        rows.push({
          month: month.key,
          monthLabel: month.label,
          week: Number(weekKey),
          region: store.region,
          store: store.name,
          hasPromoter: store.hasPromoter,
          target: round2(weekTarget * share)
        });
      });
    });
  });

  return {
    normalizedMonths,
    normalizedWeeks,
    rows
  };
}

export {
  MONTHS,
  DEFAULT_MONTH_WEIGHTS,
  DEFAULT_WEEK_WEIGHTS,
  DEFAULT_STORES,
  distributeTarget,
  normalizeWeights
};
