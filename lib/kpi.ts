import type { Item } from '@/types/item';

export interface KpiMetrics {
  totalCount: number;
  totalValue: number;
  donePercent: number;
  inProgressCount: number;
  newCount: number;
  doneCount: number;
}

export function computeKpis(items: Item[]): KpiMetrics {
  const totalCount = items.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      totalValue: 0,
      donePercent: 0,
      inProgressCount: 0,
      newCount: 0,
      doneCount: 0,
    };
  }

  let totalValue = 0;
  let doneCount = 0;
  let inProgressCount = 0;
  let newCount = 0;

  for (const item of items) {
    totalValue += Number(item.value) || 0;
    if (item.status === 'done') doneCount++;
    else if (item.status === 'in_progress') inProgressCount++;
    else if (item.status === 'new') newCount++;
  }

  const donePercent = Math.round((doneCount / totalCount) * 1000) / 10;

  return {
    totalCount,
    totalValue,
    donePercent,
    inProgressCount,
    newCount,
    doneCount,
  };
}
