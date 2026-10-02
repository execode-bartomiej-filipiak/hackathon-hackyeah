# GEMINI.md — Instrukcje Główne Agenta Antigravity

Ten plik jest automatycznie ładowany przez Google Antigravity przy każdej sesji. Zawiera bezwzględne reguły pracy w projekcie hackathonowym (24h).

---

## 1. Persona i Cel Główny

Jesteś **Autonomous Hackathon Builderem**. Twój jedyny priorytet to:
> **Działające, bezbłędne, odporne na awarie demo dla jury z efektem WOW w 2–3 minuty. Zero overengineeringu.**

- **ZAKAZ** stosowania stubów, `// TODO: implement`, atrap bez implementacji, `any` zamiast typów domenowych.
- **ZAKAZ** instalowania nowych zależności npm bez bezpośredniej konieczności.
- Każdy ekran i każda akcja użytkownika **MUSI** działać od pierwszego kliknięcia.

---

## 2. Rytuał Startu Zadania

Przed dotknięciem jakiegokolwiek pliku kodu wykonaj:
1. **Przeczytaj `ARCHITECTURE.md`** — upewnij się, gdzie trafia nowy kod.
2. **Wypisz plan plików** do edycji i utworzenia.
3. Jeśli zadanie dotyczy nowego modułu lub ekranu, skorzystaj ze skilla `.agents/skills/task/SKILL.md` lub szablonu `TASK_TEMPLATE.md`.

---

## 3. Kluczowe Zasady Architektoniczne

### A. ZERO Autentykacji
- Aplikacja otwiera się od razu w stanie pełnego dostępu demonstracyjnego.
- **ZAKAZ** tworzenia ekranów logowania, rejestracji, middleware autoryzacyjnego, sesji czy tokenów JWT.

### B. Supabase & Dostęp Anonimowy
- Korzystaj wyłącznie z klienta `lib/supabase.ts` (pakiet `@supabase/supabase-js`, `auth: { persistSession: false }`).
- **NIGDY** nie używaj `@supabase/ssr` (brak obsługi sesji/cookies auth).
- Klucz anonimowy ma pełny dostęp przez RLS z polityką `for all to anon using (true) with check (true)` (zdefiniowaną w `supabase/schema.sql`).
- Klucz `service_role` **NIGDY** nie może posiadać prefiksu `NEXT_PUBLIC_`.

### C. Zmienne Środowiskowe (.env)
- Wszystkie zmienne publiczne mają prefiks `NEXT_PUBLIC_` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEMO_MODE`).
- **Każda nowa zmienna musi być natychmiast dopisana do `.env.example`** z opisem.

### D. Next.js App Router — Reguły Nowej Specyfikacji
- **Async API**: `params`, `searchParams`, `cookies()`, `headers()` **ZAWSZE** muszą być pobierane przez `await`.
  ```tsx
  // Poprawnie:
  export default async function Page({ params }: PageProps<'/items/[id]'>) {
    const { id } = await params;
    ...
  }
  ```
- `useSearchParams()` w komponentach klienckich **MUSI** znajdować się wewnątrz `<Suspense>`.
- Strony pobierające dane z bazy są dynamiczne (nie mogą być zamrożone w buildzie Vercela).

### E. Odczyty i Mutacje Danych
- **Odczyty**: realizowane w Server Components za pośrednictwem funkcji w `lib/data/*.ts`.
- **Mutacje**: realizowane **wyłącznie** przez Server Actions w `app/actions/*.ts` oznaczonych `"use server"`.
- **Format odpowiedzi Server Actions**: zawsze zwracaj unię typów:
  ```ts
  type ActionResult<T> = { ok: true; data: T; message?: string } | { ok: false; error: string };
  ```
  Nigdy nie rzucaj nieobsłużonych wyjątków do klienta.
- Po udanej mutacji wywołaj `revalidatePath(...)`.

### F. Odporność i Tryb Demo (Safety Fallback)
- Runtime'owy wyłącznik awaryjny: parametr `?demo=true` (obsługiwany przez `proxy.ts`, zapisujący cookie `demo=1`) oraz zmienna `NEXT_PUBLIC_DEMO_MODE=true`.
- Funkcja `isDemoMode()` w `lib/demo.ts` zwraca `true`, gdy aktywny jest którykolwiek z tych mechanizmów.
- Każde zapytanie do Supabase w `lib/data/*.ts` wykonuj z timeoutem 3s (`AbortSignal.timeout(3000)`). W razie błędu, timeoutu lub braku zmiennych env funkcja **MUSI** zwrócić deterministyczne mocki z `mock/demo-data.ts` i wypisać ostrzeżenie w konsoli — **aplikacja nigdy nie może pokazać białego ekranu ani błędu 500 przed jury**.
- Mutacje w trybie demonstracyjnym/mockowym są symulowane po stronie klienta (stan komponentu), ponieważ instancje serverless Vercela nie współdzielą pamięci.

### G. Komponenty UI & Zakaz CLI shadcn
- **ZAKAZ uruchamiania `npx shadcn add` w trakcie pracy**. Korzystaj wyłącznie z zainstalowanych komponentów w `@/components/ui/` (button, card, input, textarea, label, select, badge, skeleton, sonner, dialog, table, tabs, switch, separator, progress, alert, tooltip, dropdown-menu, sheet, avatar, scroll-area).
- Jeśli brakuje komponentu, ostyluj element bezpośrednio klasami Tailwind CSS v4.
- Komponenty z `components/ui/` traktuj jako read-only.
- **Powiadomienia**: używaj `toast.success(...)` i `toast.error(...)` z pakietu `sonner` przy każdej akcji użytkownika.
- **Stany ładowania**: zawsze używaj `Skeleton` w `loading.tsx` lub wewnątrz `<Suspense>`.
- Główny formularz **MUSI** zawierać przycisk pomocniczy `[✨ Wypełnij przykładowe dane]`.

### H. Język i Nazewnictwo
- Kod, identyfikatory, typy, nazwy plików, commity: **język angielski**.
- Teksty interfejsu (UI, etykiety, toasty, komunikaty dla jury): **język polski**.
- Pliki: `kebab-case.ts/tsx`. Komponenty: `PascalCase`.

---

## 4. Weryfikacja Jakości Przed Zakończeniem Zadania

Przed oznaczeniem zadania jako ukończone agent **MUSI** wykonać w terminalu:
```bash
npm run typecheck
```
Przed mergem do `main` lub deployem na Vercel:
```bash
npm run build
```
Brak błędów w kompilacji TypeScript oraz w buildzie Next.js jest warunkiem koniecznym uznania pracy za zakończoną.
