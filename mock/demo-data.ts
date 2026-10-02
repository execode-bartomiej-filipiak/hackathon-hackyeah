import type { Item, NewItem } from '@/types/item';

export const DEMO_ITEMS: Item[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Automatyczna weryfikacja danych wejściowych',
    category: 'Diagnostyka',
    value: 12500,
    status: 'done',
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Optymalizacja zużycia energii w węźle A3',
    category: 'Ekologia',
    value: 8400,
    status: 'done',
    created_at: '2026-10-02T11:30:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Analiza predykcyjna drgań pompy głównej',
    category: 'Prewencja',
    value: 19800,
    status: 'in_progress',
    created_at: '2026-10-02T14:15:00Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Kompensacja mocy biernej na linii montażowej',
    category: 'Infrastruktura',
    value: 6200,
    status: 'new',
    created_at: '2026-10-02T16:45:00Z',
  },
];

export const SAMPLE_INPUTS: NewItem[] = [
  {
    title: 'Wykrycie mikropęknięć głowicy skrawającej',
    category: 'Diagnostyka',
    value: 15400,
    status: 'new',
  },
  {
    title: 'Rekuperacja ciepła odpadowego ze sprężarki',
    category: 'Ekologia',
    value: 9300,
    status: 'in_progress',
  },
  {
    title: 'Kalibracja czujników ciśnienia instalacji hydraulicznej',
    category: 'Prewencja',
    value: 4800,
    status: 'done',
  },
  {
    title: 'Modernizacja rozdzielnicy zasilania sekcji B',
    category: 'Infrastruktura',
    value: 22100,
    status: 'in_progress',
  },
];
