# ARCHITECTURE.md — Baza Wiedzy Architektonicznej

Dokument stanowi główne źródło wiedzy o strukturze projektu dla programistów oraz agentów AI pracujących w środowisku Google Antigravity.

---

## 1. Drzewo Katalogów

```
hackathon-hackyeah/
├── .agent/                    # [Opcjonalne] konfiguracja Antigravity
│   └── rules/                 # Modułowe reguły per-folder
├── .agents/
│   └── skills/                # Pakiety umiejętności agenta (otwarty standard Antigravity)
│       └── task/
│           └── SKILL.md       # Procedura realizacji zadania hackathonowego
├── app/                       # Next.js App Router
│   ├── actions/               # Server Actions ("use server") — mutacje bazy/stanu
│   │   └── items.ts
│   ├── items/
│   │   └── [id]/              # Podstrona szczegółów (obsługa async params)
│   │       └── page.tsx
│   ├── favicon.ico
│   ├── globals.css            # Tailwind CSS v4 + zmienne kolorów shadcn
│   ├── layout.tsx             # Root layout (lang="pl", <Toaster />, <TooltipProvider />)
│   ├── loading.tsx            # Globalny stan ładowania (Skeleton)
│   ├── error.tsx              # Error boundary z przyciskiem retry
│   └── page.tsx               # Główny pulpit (Dashboard)
├── components/
│   ├── dashboard/             # Komponenty domenowe i widoki
│   │   ├── demo-badge.tsx     # Oznaczenie aktywnego trybu demo / fallback
│   │   ├── item-form.tsx      # Formularz z przyciskiem [✨ Wypełnij przykładowe dane]
│   │   ├── items-board.tsx    # Główny kontener kliencki integrujący formularz, tabelę i KPI
│   │   ├── items-table.tsx    # Tabela rekordów
│   │   ├── kpi-tiles.tsx      # 3 kluczowe kafelki biznesowe pod jury
│   │   └── reset-demo-button.tsx # Przycisk przywracania stanu początkowego demo
│   └── ui/                    # Komponenty shadcn (read-only, zainstalowane przed startem)
├── lib/
│   ├── data/                  # Funkcje odczytu danych dla Server Components
│   │   └── items.ts           # getItems(), getItem() z fallbackiem na mocki
│   ├── demo.ts                # Detekcja trybu demo (cookie / env)
│   ├── kpi.ts                 # Czyste funkcje obliczania metryk biznesowych
│   ├── supabase.ts            # Klient anonimowy Supabase (@supabase/supabase-js)
│   └── utils.ts               # Pomocnik cn()
├── mock/
│   └── demo-data.ts           # Deterministyczne rekordy startowe (stałe UUID, stałe daty)
├── supabase/
│   ├── schema.sql             # Definicja tabel + RLS z pełnym dostępem anonimowym
│   └── seed.sql               # Idempotentne zapytania ładujące rekordy startowe
├── types/
│   ├── action.ts              # Typ ActionResult<T>
│   └── item.ts                # Typ encji domenowej Item i NewItem
├── .env.example               # Wzór wszystkich wymaganych zmiennych środowiskowych
├── AGENTS.md                  # Reguły Next.js 16 wstrzykiwane przez generator frameworka
├── CLAUDE.md                  # Wskaźnik dla asystentów zgodnych ze standardem
├── DEMO_SPEC_TEMPLATE.md      # Szablon prezentacji 2–3 min przed jury
├── GEMINI.md                  # Główne instrukcje agenta Antigravity
├── proxy.ts                   # Next.js 16 proxy — obsługa przełącznika ?demo=true/false
└── TASK_TEMPLATE.md           # Szablon zgłoszenia zadania
```

---

## 2. Konwencje Nazewnictwa i Importów

- **Alias importów**: Zawsze używaj `@/*` (np. `@/components/ui/button`, `@/lib/supabase`, `@/types/item`).
- **Pliki i foldery**: `kebab-case.ts` / `kebab-case.tsx`.
- **Komponenty React**: `PascalCase` w nazwie funkcji i pliku (np. `ItemForm` w `components/dashboard/item-form.tsx`).
- **Typy**: `PascalCase` (np. `Item`, `ActionResult`).
- **Język w kodzie**: Angielski w logice i strukturach, Polski w tekstach widocznych dla użytkownika i jury.

---

## 3. Wzorzec Odczytów i Fallbacku na Mocki

Wszystkie odczyty dla Server Components wykonuj przez warstwę `lib/data/*.ts`:

```ts
import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { DEMO_ITEMS } from '@/mock/demo-data';
import type { Item } from '@/types/item';

export async function getItems(): Promise<{ items: Item[]; source: 'db' | 'mock' }> {
  // 1. Wymuszony tryb demo (?demo=true lub NEXT_PUBLIC_DEMO_MODE=true)
  if (await isDemoMode()) {
    return { items: DEMO_ITEMS, source: 'mock' };
  }

  // 2. Brak konfiguracji bazy danych
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { items: DEMO_ITEMS, source: 'mock' };
  }

  // 3. Próba pobrania z bazy z limitem czasu 3 s
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(3000));

    if (error || !data) {
      console.warn('[getItems] Błąd Supabase, aktywowano fallback:', error?.message);
      return { items: DEMO_ITEMS, source: 'mock' };
    }

    return { items: data as Item[], source: 'db' };
  } catch (err) {
    console.warn('[getItems] Timeout/wyjątek, aktywowano fallback:', err);
    return { items: DEMO_ITEMS, source: 'mock' };
  }
}
```

---

## 4. Wzorzec Mutacji (Server Actions) i UI/UX

1. **Mutacja po stronie serwera**:
   - Plik w `app/actions/*.ts` oznaczony `"use server"`.
   - Walidacja danych wejściowych, zwrócenie ustrukturyzowanego `ActionResult<T>`.
   - Wywołanie `revalidatePath('/')` po udanym zapisie.
2. **Wywołanie z komponentu klienckiego**:
   - `useTransition` do zablokowania przycisków podczas trwania akcji (`isPending`).
   - Wywołanie powiadomienia `toast.success('Pomyślnie dodano rekord')` lub `toast.error('Błąd: ...')`.
   - W trybie mock/demo — natychmiastowe dopisanie rekordu do stanu lokalnego `useState`, aby jury widziało wynik bez opóźnień.
3. **Stany ładowania**:
   - `app/loading.tsx` renderuje szkielet ekranu z wykorzystaniem komponentu `Skeleton` z shadcn.
4. **Powiadomienia**:
   - Główny kontener `<Toaster />` z `sonner` jest osadzony w `app/layout.tsx`.

---

## 5. Baza Danych i RLS (Supabase)

- Tabela `public.items` jest tworzona przez skrypt `supabase/schema.sql`.
- RLS jest **włączone**, a polityka zezwala anonimowemu użytkownikowi na wszystkie operacje:
  ```sql
  alter table public.items enable row level security;
  create policy "anon_all_access" on public.items for all to anon using (true) with check (true);
  grant all on public.items to anon;
  ```
- Dane początkowe wgrywane są przez `supabase/seed.sql` za pomocą `on conflict (id) do nothing`, co pozwala na wielokrotne uruchamianie bez duplikacji.
- Przycisk **„Resetuj dane demo”** wywołuje Server Action czyszczącą tabelę i wstawiającą rekordy z `mock/demo-data.ts`.
