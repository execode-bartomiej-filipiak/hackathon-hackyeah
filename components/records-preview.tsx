'use client';

import { useState, useTransition } from 'react';
import type { RecordItem } from '@/types/record';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DatabaseIcon,
  SparklesIcon,
  PlusCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  TagIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { createRecord } from '@/app/actions/records';
import { SAMPLE_INPUTS } from '@/mock/demo-data';

interface RecordsPreviewProps {
  initialRecords: RecordItem[];
  source: 'db' | 'mock';
  latencyMs?: number;
  projectHost?: string;
}

export function RecordsPreview({ initialRecords, source, latencyMs, projectHost }: RecordsPreviewProps) {
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  const [isPending, startTransition] = useTransition();

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formValue, setFormValue] = useState<number | string>('');
  const [sampleIndex, setSampleIndex] = useState(0);

  const handleFillSample = () => {
    const sample = SAMPLE_INPUTS[sampleIndex % SAMPLE_INPUTS.length];
    setFormName(sample.name);
    setFormCategory(sample.category);
    setFormValue(sample.value);
    setSampleIndex((prev) => prev + 1);
    toast.info('Wypełniono przykładowe dane!');
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('Wpisz nazwę rekordu!');
      return;
    }

    startTransition(async () => {
      const res = await createRecord({
        name: formName.trim(),
        category: formCategory.trim() || 'Ogólne',
        value: Number(formValue) || 0,
        status: 'active',
      });

      if (res.ok) {
        toast.success(res.message || 'Pomyślnie dodano rekord!');
        setRecords((prev) => [res.data, ...prev]);
        setFormName('');
        setFormCategory('');
        setFormValue('');
      } else {
        toast.error(res.error || 'Nie udało się dodać rekordu.');
      }
    });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DatabaseIcon className="size-5 text-primary" />
              <CardTitle className="text-lg font-bold">
                Tabela Supabase: <code className="font-mono text-primary font-semibold">public.records</code>
              </CardTitle>
            </div>
            <CardDescription className="text-xs flex flex-wrap items-center gap-2 pt-0.5">
              <span>Dane zsynchronizowane z PostgreSQL w chmurze Supabase.</span>
              {projectHost && (
                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                  host: {projectHost}
                </span>
              )}
              {typeof latencyMs === 'number' && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  (czas zapytania: {latencyMs} ms)
                </span>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {source === 'db' ? (
              <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-2.5 text-xs">
                <CheckCircle2Icon className="size-3.5" />
                Źródło: Baza Supabase (na żywo)
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1.5 py-1 px-2.5 text-xs">
                <AlertCircleIcon className="size-3.5" />
                Źródło: Tryb Mock (Fallback)
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Liczba rekordów: {records.length}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* FORMULARZ TESTOWY DO DODAWANIA REKORDU */}
        <form onSubmit={handleAddRecord} className="rounded-lg border border-border/80 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <PlusCircleIcon className="size-3.5 text-primary" />
              Dodaj nowy rekord do bazy Supabase:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="text-xs h-7 gap-1"
            >
              <SparklesIcon className="size-3 text-amber-500" />
              ✨ Wypełnij przykładowe dane
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="rec-name" className="text-[11px] text-muted-foreground">Nazwa rekordu</Label>
              <Input
                id="rec-name"
                placeholder="np. Nowy test Vercela"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-xs bg-background"
                required
              />
            </div>
            <div>
              <Label htmlFor="rec-cat" className="text-[11px] text-muted-foreground">Kategoria</Label>
              <Input
                id="rec-cat"
                placeholder="np. Test / Integracja"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Label htmlFor="rec-val" className="text-[11px] text-muted-foreground">Wartość (PLN)</Label>
              <Input
                id="rec-val"
                type="number"
                placeholder="np. 5000"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <PlusCircleIcon className="size-3.5" />
              {isPending ? 'Zapisywanie w Supabase...' : 'Zapisz w Supabase'}
            </Button>
          </div>
        </form>

        {/* LISTA REKORDÓW Z SUPABASE */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Zwrócone rekordy z bazy:
          </div>

          {records.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Brak rekordów w tabeli.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-lg border border-border bg-card">
              {records.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40 sm:p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {item.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        ID: {item.id.slice(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <TagIcon className="size-3" />
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3" />
                        {new Date(item.created_at).toLocaleString('pl-PL')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      {Number(item.value).toLocaleString('pl-PL', {
                        style: 'currency',
                        currency: 'PLN',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
