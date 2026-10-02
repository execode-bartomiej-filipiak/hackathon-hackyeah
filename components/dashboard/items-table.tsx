import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRightIcon, InboxIcon } from 'lucide-react';
import type { Item, ItemStatus } from '@/types/item';

interface ItemsTableProps {
  items: Item[];
}

function StatusBadge({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'done':
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          Ukończone
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
          W toku
        </Badge>
      );
    case 'new':
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Nowe
        </Badge>
      );
  }
}

export function ItemsTable({ items }: ItemsTableProps) {
  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Lista zgłoszeń i rekordów</CardTitle>
            <CardDescription className="text-xs">
              Kliknij wybrany rekord, aby otworzyć widok szczegółowy
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            Liczba pozycji: <span className="font-semibold text-foreground">{items.length}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <InboxIcon className="size-10 stroke-1 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Brak rekordów w systemie</p>
            <p className="text-xs">Użyj powyższego formularza, aby dodać pierwsze zgłoszenie.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Tytuł zgłoszenia</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Wartość (PLN)</TableHead>
                  <TableHead className="text-right">Szczegóły</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isLocal = item.id.startsWith('local-');
                  const formattedValue = Number(item.value || 0).toLocaleString('pl-PL', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  });

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {isLocal ? (
                          <div className="flex items-center gap-1.5">
                            <span>{item.title}</span>
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                              demo
                            </Badge>
                          </div>
                        ) : (
                          <Link
                            href={`/items/${item.id}`}
                            className="hover:underline hover:text-primary font-medium"
                          >
                            {item.title}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formattedValue} PLN
                      </TableCell>
                      <TableCell className="text-right">
                        {isLocal ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Link
                            href={`/items/${item.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Otwórz
                            <ArrowUpRightIcon className="size-3" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
