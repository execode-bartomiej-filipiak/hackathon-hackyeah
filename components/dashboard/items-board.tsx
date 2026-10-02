'use client';

import { useState } from 'react';
import { KpiTiles } from '@/components/dashboard/kpi-tiles';
import { ItemForm } from '@/components/dashboard/item-form';
import { ItemsTable } from '@/components/dashboard/items-table';
import { ResetDemoButton } from '@/components/dashboard/reset-demo-button';
import { computeKpis } from '@/lib/kpi';
import { DEMO_ITEMS } from '@/mock/demo-data';
import type { Item } from '@/types/item';

interface ItemsBoardProps {
  initialItems: Item[];
}

export function ItemsBoard({ initialItems }: ItemsBoardProps) {
  const [items, setItems] = useState<Item[]>(initialItems);

  const handleItemCreated = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleReset = () => {
    setItems(DEMO_ITEMS);
  };

  const metrics = computeKpis(items);

  return (
    <div className="space-y-6">
      {/* PASEK AKCJI DEMO */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pulpit Operacyjny</h2>
          <p className="text-xs text-muted-foreground">
            Zestawienie telemetrii, projektów i zgłoszeń w czasie rzeczywistym
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResetDemoButton onReset={handleReset} />
        </div>
      </div>

      {/* METRYKI BIZNESOWE (KPI) */}
      <KpiTiles metrics={metrics} />

      {/* FORMULARZ Z PRZYCISKIEM SZYBKIEGO WYPEŁNIANIA DANYCH DEMO */}
      <ItemForm onItemCreated={handleItemCreated} />

      {/* TABELA REKORDÓW */}
      <ItemsTable items={items} />
    </div>
  );
}
