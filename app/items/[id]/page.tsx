import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getItem } from '@/lib/data/items';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeftIcon, CalendarIcon, CoinsIcon, TagIcon } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailsPage({ params }: PageProps) {
  // Ścisła reguła nowej specyfikacji Next.js 16: params MUSI być asynchroniczne
  const { id } = await params;
  const { item } = await getItem(id);

  if (!item) {
    notFound();
  }

  const formattedValue = Number(item.value || 0).toLocaleString('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  });

  const formattedDate = new Date(item.created_at).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/">
            <ArrowLeftIcon className="size-3.5" />
            Powrót do pulpitu
          </Link>
        </Button>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              ID: {item.id}
            </Badge>
            <Badge
              variant="outline"
              className={
                item.status === 'done'
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : item.status === 'in_progress'
                  ? 'border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-secondary text-muted-foreground'
              }
            >
              {item.status === 'done' ? 'Ukończone' : item.status === 'in_progress' ? 'W toku' : 'Nowe'}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold">{item.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Szczegóły zgłoszenia zarejestrowanego w systemie demonstracyjnym
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 border-t border-border pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TagIcon className="size-3.5" />
                Kategoria
              </div>
              <p className="mt-1 font-semibold">{item.category}</p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CoinsIcon className="size-3.5 text-emerald-600" />
                Wycena / Wartość
              </div>
              <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {formattedValue}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                Data utworzenia
              </div>
              <p className="mt-1 text-xs font-medium">{formattedDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
