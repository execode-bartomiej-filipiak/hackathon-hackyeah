/**
 * ==============================================================================
 * MOCK DATA TEMPLATE — Zdefiniuj tutaj dane demonstracyjne po ogłoszeniu tematu
 * ==============================================================================
 * Zasady dla agenta Antigravity:
 * 1. Zawsze używaj stałych ID (UUID lub unikalne stringi) i stałych dat (ISO),
 *    aby uniknąć błędów hydracji w SSR.
 * 2. Struktura obiektów musi odpowiadać typom domenowym z folderu types/.
 * 3. Zdefiniuj SAMPLE_INPUTS do rotacyjnego wypełniania formularza przez przycisk:
 *    [✨ Wypełnij przykładowe dane].
 */

export interface DemoItemPlaceholder {
  id: string;
  name: string;
  category: string;
  value: number;
  status: 'active' | 'pending' | 'completed';
  created_at: string;
}

export const INITIAL_DEMO_DATA: DemoItemPlaceholder[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Przykładowy rekord #1',
    category: 'Ogólne',
    value: 12000,
    status: 'completed',
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Przykładowy rekord #2',
    category: 'Priorytet',
    value: 8500,
    status: 'active',
    created_at: '2026-10-02T12:00:00Z',
  },
];

export const SAMPLE_INPUTS: Array<Omit<DemoItemPlaceholder, 'id' | 'created_at'>> = [
  {
    name: 'Nowa inicjatywa demonstracyjna A',
    category: 'Innowacja',
    value: 15000,
    status: 'active',
  },
  {
    name: 'Zgłoszenie optymalizacyjne B',
    category: 'Priorytet',
    value: 23000,
    status: 'completed',
  },
];
