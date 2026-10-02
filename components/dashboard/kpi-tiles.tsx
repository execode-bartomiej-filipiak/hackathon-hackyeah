import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ActivityIcon, CoinsIcon, CheckCircle2Icon } from 'lucide-react';
import type { KpiMetrics } from '@/lib/kpi';

interface KpiTilesProps {
  metrics: KpiMetrics;
}

export function KpiTiles({ metrics }: KpiTilesProps) {
  const formattedValue = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(metrics.totalValue);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* KAFELEK 1: Całkowita liczba incydentów */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Zarejestrowane rekordy
          </CardTitle>
          <ActivityIcon className="size-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{metrics.totalCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            W toku: <span className="font-semibold text-foreground">{metrics.inProgressCount}</span> •
            Nowe: <span className="font-semibold text-foreground">{metrics.newCount}</span>
          </p>
        </CardContent>
      </Card>

      {/* KAFELEK 2: Wartość biznesowa */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Łączna wartość projektów
          </CardTitle>
          <CoinsIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formattedValue}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Średnia per rekord: {metrics.totalCount > 0 ? Math.round(metrics.totalValue / metrics.totalCount).toLocaleString('pl-PL') : 0} PLN
          </p>
        </CardContent>
      </Card>

      {/* KAFELEK 3: Skuteczność realizacji */}
      <Card className="border-border shadow-xs sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Wskaźnik realizacji
          </CardTitle>
          <CheckCircle2Icon className="size-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">{metrics.donePercent}%</span>
            <span className="text-xs text-muted-foreground">
              {metrics.doneCount} z {metrics.totalCount} ukończonych
            </span>
          </div>
          <div className="mt-3">
            <Progress value={metrics.donePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
