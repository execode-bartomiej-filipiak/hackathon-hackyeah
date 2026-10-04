'use client';

import { useState, useEffect } from 'react';
import type { TravelMode, CommuteDestination } from '@/types/commute';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrainIcon,
  CarIcon,
  BikeIcon,
  FootprintsIcon,
  MapPinIcon,
  TargetIcon,
  PencilIcon,
} from 'lucide-react';

interface AddDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: [number, number] | null;
  initialAddress: string;
  district: string;
  initialDestination?: CommuteDestination | null;
  onConfirm: (destination: {
    id?: string;
    name: string;
    category: CommuteDestination['category'];
    icon: string;
    frequencyPerWeek: number;
    travelMode: TravelMode;
    coordinates: [number, number];
  }) => void;
}

const CATEGORY_OPTIONS: Array<{
  category: CommuteDestination['category'];
  label: string;
  icon: string;
}> = [
  { category: 'work', label: 'Praca / Biuro', icon: '🏢' },
  { category: 'family', label: 'Dom / Rodzina', icon: '🏡' },
  { category: 'hobby', label: 'Sport / Hobby', icon: '🏋️' },
  { category: 'education', label: 'Edukacja', icon: '🎒' },
  { category: 'shopping', label: 'Zakupy', icon: '🛍️' },
  { category: 'other', label: 'Inne miejsce', icon: '🎯' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1x / tydz.' },
  { value: 2, label: '2x / tydz.' },
  { value: 3, label: '3x / tydz.' },
  { value: 5, label: '5x / tydz.' },
];

const TRAVEL_MODES: Array<{
  mode: TravelMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'transit', label: 'MPK', icon: TrainIcon },
  { mode: 'driving', label: 'Auto', icon: CarIcon },
  { mode: 'bicycling', label: 'Rower', icon: BikeIcon },
  { mode: 'walking', label: 'Pieszo', icon: FootprintsIcon },
];

export function AddDestinationDialog({
  open,
  onOpenChange,
  coordinates,
  initialAddress,
  district,
  initialDestination,
  onConfirm,
}: AddDestinationDialogProps) {
  const isEdit = Boolean(initialDestination);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<CommuteDestination['category']>('work');
  const [icon, setIcon] = useState('🏢');
  const [frequency, setFrequency] = useState(3);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');

  useEffect(() => {
    if (open) {
      if (initialDestination) {
        setName(initialDestination.name);
        setCategory(initialDestination.category);
        setIcon(initialDestination.icon);
        setFrequency(initialDestination.frequencyPerWeek);
        setTravelMode(initialDestination.travelMode);
      } else {
        setName(initialAddress || 'Nowe odwiedzane miejsce');
        setCategory('work');
        setIcon('🏢');
        setFrequency(3);
        setTravelMode('transit');
      }
    }
  }, [open, initialAddress, initialDestination]);

  const handleSelectCategory = (cat: (typeof CATEGORY_OPTIONS)[0]) => {
    setCategory(cat.category);
    setIcon(cat.icon);
  };

  const handleSave = () => {
    const finalCoords = initialDestination?.coordinates || coordinates;
    if (!finalCoords) return;

    onConfirm({
      id: initialDestination?.id,
      name: name.trim() || initialAddress || 'Odwiedzane miejsce',
      category,
      icon,
      frequencyPerWeek: frequency,
      travelMode,
      coordinates: finalCoords,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs">
            {isEdit ? <PencilIcon className="size-4" /> : <TargetIcon className="size-4" />}
            <span>{isEdit ? 'Edycja Odwiedzanego Miejsca' : 'Nowe Odwiedzane Miejsce'}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? 'Zmień parametry miejsca' : 'Zdefiniuj odwiedzane miejsce na mapie'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
            <MapPinIcon className="size-3 text-primary shrink-0" />
            <span className="truncate">
              Lokalizacja: {initialAddress || initialDestination?.name} ({district})
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 text-xs">
          {/* NAZWA CELU */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-name" className="text-[11px] font-semibold text-foreground">
              Nazwa odwiedzanego miejsca:
            </Label>
            <Input
              id="dest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Moje biuro, Siłownia, Rodzice"
              className="text-xs h-8.5 bg-background font-medium"
            />
          </div>

          {/* KATEGORIA I IKONA */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">
              Kategoria:
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.category;
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate text-[11px] sm:text-xs">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CZĘSTOTLIWOŚĆ W TYGODNIU */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">
              Ile razy w tygodniu tam bywasz?
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {FREQUENCY_OPTIONS.map((f) => {
                const isSelected = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ŚRODEK TRANSPORTU */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">
              Domyślny środek transportu:
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TRAVEL_MODES.map((m) => {
                const isSelected = travelMode === m.mode;
                const Icon = m.icon;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setTravelMode(m.mode)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="text-xs h-8 font-medium gap-1.5"
          >
            <span>{isEdit ? 'Zapisz zmiany' : 'Zatwierdź miejsce'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
