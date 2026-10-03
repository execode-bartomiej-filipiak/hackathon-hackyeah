---
name: hackathon-task
description: Standardowa procedura realizacji zadania w projekcie hackathonowym (Next.js, Supabase, shadcn). Uruchamiaj przy każdym nowym zadaniu, poprawce lub dodaniu funkcji.
---

# Procedura Realizacji Zadania Hackathonowego

Stosuj tę procedurę przy każdym zadaniu programistycznym w tym repozytorium:

## 1. Faza Planowania (przed zmianami w kodzie)
1. Sprawdź `ARCHITECTURE.md` i upewnij się, jak zadanie wpisuje się w strukturę projektu.
2. Zdefiniuj i wypisz listę plików do modyfikacji oraz utworzenia.
3. Potwierdź, że nie dodajesz autentykacji, zbędnych bibliotek ani CLI shadcn.

## 2. Faza Implementacji
1. Implementuj kod w całości — **bezwzględny zakaz stubów, mocków bez logiki i `// TODO`**.
2. Odczyty umieszczaj w `lib/data/`, mutacje w `app/actions/` z `"use server"`.
3. Każda Server Action zwraca `{ ok: true, data } | { ok: false, error }` i woła `revalidatePath`.
4. Komponenty UI korzystają wyłącznie z zainstalowanych elementów w `@/components/ui/` lub klas Tailwind.
5. Każda akcja użytkownika pokazuje powiadomienie przez `sonner` (`toast.success` / `toast.error`).
6. Wszystkie zapytania bazodanowe posiadają zabezpieczenie fallback na dane z `mock/demo-data.ts`.

## 3. Faza Weryfikacji (przed zakończeniem)
Uruchom w terminalu i upewnij się, że nie ma błędów:
```bash
npm run typecheck
```
Gdy zadanie jest gotowe do zintegrowania:
```bash
npm run build
```

## 4. Faza Publikacji (Git & Vercel)
1. Zmiany commituj i pushuj **wyłącznie na branchu `dev`**.
2. Na branch `main` (uruchamiający deployment Vercel) merguj wyłącznie na wyraźne żądanie programistów.
```
