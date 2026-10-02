'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SparklesIcon, PlusCircleIcon, Loader2Icon } from 'lucide-react';
import { createItem } from '@/app/actions/items';
import { SAMPLE_INPUTS } from '@/mock/demo-data';
import { toast } from 'sonner';
import type { Item, ItemStatus } from '@/types/item';

interface ItemFormProps {
  onItemCreated: (item: Item) => void;
}

export function ItemForm({ onItemCreated }: ItemFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Diagnostyka');
  const [value, setValue] = useState('15000');
  const [status, setStatus] = useState<ItemStatus>('new');
  const [sampleIndex, setSampleIndex] = useState(0);

  const [isPending, startTransition] = useTransition();

  const handleFillSample = () => {
    const sample = SAMPLE_INPUTS[sampleIndex % SAMPLE_INPUTS.length];
    setTitle(sample.title);
    setCategory(sample.category);
    setValue(String(sample.value));
    setStatus(sample.status || 'new');
    setSampleIndex((prev) => prev + 1);

    toast.info('Wypełniono formularz przykładowymi danymi demonstracyjnymi.', {
      duration: 2000,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Podaj tytuł rekordu.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createItem({
          title,
          category,
          value: Number(value) || 0,
          status,
        });

        if (result.ok) {
          toast.success(result.message || 'Pomyślnie dodano nowy rekord!');
          onItemCreated(result.data);
          // Czyszczenie formularza po sukcesie
          setTitle('');
          setValue('10000');
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error('Wystąpił nieoczekiwany błąd podczas zapisu.');
        console.error(err);
      }
    });
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">Dodaj nowe zgłoszenie</CardTitle>
            <CardDescription className="text-xs">
              Wprowadź dane lub użyj przycisku demo, aby przetestować działanie w 2 sekundy
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleFillSample}
            className="gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <SparklesIcon className="size-3.5 text-amber-500" />
            Wypełnij przykładowe dane
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item-title" className="text-xs">
                Tytuł zgłoszenia / projektu
              </Label>
              <Input
                id="item-title"
                placeholder="np. Diagnostyka węzła chłodzenia..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-category" className="text-xs">
                Kategoria
              </Label>
              <Select value={category} onValueChange={setCategory} disabled={isPending}>
                <SelectTrigger id="item-category" className="w-full">
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diagnostyka">Diagnostyka</SelectItem>
                  <SelectItem value="Ekologia">Ekologia</SelectItem>
                  <SelectItem value="Prewencja">Prewencja</SelectItem>
                  <SelectItem value="Infrastruktura">Infrastruktura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-value" className="text-xs">
                Wartość / Oszczędność (PLN)
              </Label>
              <Input
                id="item-value"
                type="number"
                min="0"
                step="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="item-status" className="text-xs text-muted-foreground">
                Status początkowy:
              </Label>
              <Select value={status} onValueChange={(val) => setStatus(val as ItemStatus)} disabled={isPending}>
                <SelectTrigger id="item-status" className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nowe</SelectItem>
                  <SelectItem value="in_progress">W toku</SelectItem>
                  <SelectItem value="done">Ukończone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isPending} className="gap-1.5 font-medium">
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusCircleIcon className="size-4" />
              )}
              Zapisz rekord
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
