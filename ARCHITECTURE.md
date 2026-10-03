# ARCHITECTURE.md — Baza Wiedzy Architektonicznej

Dokument stanowi główne źródło wiedzy o strukturze projektu dla programistów oraz agentów AI pracujących w środowisku Google Antigravity.

---

## 1. Drzewo Katalogów

```
hackathon-hackyeah/
├── .agents/
│   └── skills/                # Pakiety umiejętności agenta (otwarty standard Antigravity)
│       └── task/
│           └── SKILL.md       # Procedura realizacji zadania hackathonowego
├── app/                       # Next.js App Router
│   ├── actions/               # Server Actions ("use server") — mutacje bazy/stanu
│   ├── favicon.ico
│   ├── globals.css            # Tailwind CSS v4 + zmienne kolorów shadcn
│   ├── layout.tsx             # Root layout (lang="pl", <Toaster />, <TooltipProvider />)
│   ├── loading.tsx            # Globalny stan ładowania (Skeleton)
│   ├── error.tsx              # Error boundary z przyciskiem retry
│   └── page.tsx               # Główny pulpit aplikacji
├── components/
│   ├── ui/                    # Komponenty shadcn (read-only, zainstalowane przed startem)
│   └── [feature]/             # Komponenty domenowe podzielone na moduły
├── lib/
│   ├── data/                  # Funkcje odczytu danych dla Server Components
│   ├── demo.ts                # Detekcja trybu demo (cookie / env)
│   ├── supabase.ts            # Klient anonimowy Supabase (@supabase/supabase-js)
│   └── utils.ts               # Pomocnik cn()
├── mock/
│   └── demo-data.ts           # Deterministyczne rekordy startowe (stałe UUID, stałe daty)
├── supabase/
│   ├── schema.sql             # Definicja tabel + RLS z pełnym dostępem anonimowym
│   └── seed.sql               # Idempotentne zapytania ładujące rekordy startowe
├── types/
│   └── action.ts              # Typ ActionResult<T>
├── .env.example               # Wzór wszystkich wymaganych zmiennych środowiskowych
├── AGENTS.md                  # Reguły Next.js 16 wstrzykiwane przez generator frameworka
├── DEMO_SPEC_TEMPLATE.md      # Szablon prezentacji 2–3 min przed jury
├── GEMINI.md                  # Główne instrukcje agenta Antigravity
├── proxy.ts                   # Next.js 16 proxy — obsługa przełącznika ?demo=true/false
└── TASK_TEMPLATE.md           # Szablon zgłoszenia zadania
```

---

## 2. Konwencje Nazewnictwa i Importów

- **Alias importów**: Zawsze używaj `@/*` (np. `@/components/ui/button`, `@/lib/supabase`, `@/types/action`).
- **Pliki i foldery**: `kebab-case.ts` / `kebab-case.tsx`.
- **Komponenty React**: `PascalCase` w nazwie funkcji i pliku.
- **Typy**: `PascalCase` (np. `ActionResult`).
- **Język w kodzie**: Angielski w logice i strukturach, Polski w tekstach widocznych dla użytkownika i jury.

---

## 3. Wzorzec Odczytów i Fallbacku na Mocki

Wszystkie odczyty dla Server Components wykonuj przez warstwę `lib/data/*.ts`:

```ts
import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { INITIAL_DEMO_DATA } from '@/mock/demo-data';

export async function getData() {
  // 1. Wymuszony tryb demo (?demo=true lub NEXT_PUBLIC_DEMO_MODE=true)
  if (await isDemoMode()) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' as const };
  }

  // 2. Brak konfiguracji bazy danych
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' as const };
  }

  // 3. Próba pobrania z bazy z limitem czasu 3 s
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(3000));

    if (error || !data) {
      console.warn('[getData] Błąd Supabase, aktywowano fallback:', error?.message);
      return { data: INITIAL_DEMO_DATA, source: 'mock' as const };
    }

    return { data, source: 'db' as const };
  } catch (err) {
    console.warn('[getData] Timeout/wyjątek, aktywowano fallback:', err);
    return { data: INITIAL_DEMO_DATA, source: 'mock' as const };
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

- Tabele tworzone są przez skrypt `supabase/schema.sql`.
- RLS jest **włączone**, a polityka zezwala anonimowemu użytkownikowi na wszystkie operacje:
  ```sql
  alter table public.records enable row level security;
  create policy "anon_all_access" on public.records for all to anon using (true) with check (true);
  grant all on public.records to anon;
  ```
- Dane początkowe wgrywane są przez `supabase/seed.sql` za pomocą `on conflict (id) do nothing`, co pozwala na wielokrotne uruchamianie bez duplikacji.

---

## 6. Workflow Git i Wdrażanie na Żądanie (Vercel)

W projekcie obowiązuje dwugałęziowy model pracy:

1. **Branch `dev` (Rozwój i Integracja Zespołu)**:
   - Cały bieżący development obu programistów i agenta Antigravity odbywa się na gałęzi `dev`.
   - Vercel ma aktywną regułę **Ignored Build Step**:
     ```bash
     if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
     ```
   - Każdy push do `dev` jest przez Vercel automatycznie ignorowany — brak zbędnych deploymentów i zużywania limitów konta.

2. **Branch `main` (Produkcyjne Demo dla Jury)**:
   - Odzwierciedla działającą, przetestowaną wersję demonstracyjną na [hackathon-hackyeah.vercel.app](https://hackathon-hackyeah.vercel.app).
   - Scalenie z `dev` następuje **wyłącznie na wyraźne żądanie programistów**.
   - Procedura publikacji nowej wersji demo:
     ```bash
     npm run typecheck && npm run build
     git checkout main
     git merge dev
     git push origin main
     git checkout dev
     ```
