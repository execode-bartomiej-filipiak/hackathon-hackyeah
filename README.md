# Hackathon Project Starter (24h) — QuickResolve AI

Solidny szkielet projektu przygotowany pod 24-godzinny hackathon dla zespołu pracującego w środowisku **Google Antigravity (Gemini)**.

---

## 🚀 Szybki Start

### 1. Instalacja i uruchomienie lokalne
```bash
npm install
npm run dev
```
Aplikacja uruchomi się na [http://localhost:3000](http://localhost:3000).

### 2. Sprawdzenie typów i build produkcyjny
```bash
npm run typecheck   # Walidacja typów TypeScript z generacją tras Next.js
npm run build       # Build produkcyjny Next.js
```

---

## 🛠️ Stack Technologiczny

- **Framework**: Next.js 16 (App Router, async `params`, `proxy.ts`, Server Actions)
- **Komponenty**: shadcn/ui (Radix Primitives, Tailwind CSS v4, Lucide Icons, Sonner)
- **Baza danych**: Supabase PostgreSQL przez `@supabase/supabase-js` (klient anonimowy)
- **Deployment**: Vercel

---

## ⚡ Kluczowe Zasady Architektury Hackathonowej

1. **ZERO Autentykacji**: Żadnych ekranów logowania, sesji ani tokenów. Aplikacja otwiera się natychmiast w pełnym dostępie demonstracyjnym.
2. **Pełna Odporność (Offline Fallback)**: Jeśli baza Supabase nie jest skonfigurowana lub nie odpowiada w ciągu 3 sekund, aplikacja automatycznie serwuje deterministyczne dane z `mock/demo-data.ts`.
3. **Awaryjny Przełącznik Demo**: Dopisanie w pasku adresu `?demo=true` natychmiast włącza tryb mocków (zapisując cookie). Wyłączenie: `?demo=false`.
4. **Przycisk dla Prelegenta**: Formularz zawiera przycisk `[✨ Wypełnij przykładowe dane]`, eliminujący potrzebę ręcznego wpisywania tekstu na scenie.
5. **Reset Demo**: Przycisk `[Resetuj dane demo]` przywraca stan początkowy danych.

---

## 🗄️ Konfiguracja Bazy Danych (Supabase)

1. Utwórz nowy projekt w [Supabase](https://supabase.com).
2. Otwórz **SQL Editor** i wykonaj skrypt:
   - `supabase/schema.sql` (tworzy tabelę `items` oraz politykę RLS z pełnym dostępem anonimowym).
   - `supabase/seed.sql` (wgrywa początkowe rekordy demonstracyjne).
3. Skopiuj `.env.example` do `.env.local` i uzupełnij klucze:
   ```bash
   cp .env.example .env.local
   ```


---

## 🌿 Workflow Git & Wdrażanie na Żądanie (Vercel)

W projekcie pracujemy zespołowo na dwóch gałęziach:

1. **`dev` (Rozwój bieżący)**:
   - Cały development i commity (Twoje, kolegi oraz agenta AI) trafiają na branch `dev`.
   - Vercel **nie buduje** zmian wypychanych do `dev` (skonfigurowany `Ignored Build Step`), oszczędzając limity konta i czas.
2. **`main` (Środowisko Produkcyjne Demo)**:
   - Vercel odpala build **wyłącznie** po scaleniu do `main`.
   - Gdy chcecie zaktualizować wersję na żywo dla jury:
     ```bash
     npm run typecheck && npm run build
     git checkout main
     git merge dev
     git push origin main
     git checkout dev
     ```
---

## 📚 Dokumentacja i Wytyczne dla Agenta

- **`GEMINI.md`**: Główne wytyczne i zakazy dla agenta Antigravity (ładowane automatycznie).
- **`ARCHITECTURE.md`**: Szczegółowe drzewo plików, wzorce odczytów i Server Actions.
- **`TASK_TEMPLATE.md`**: Szablon zlecania zadań dla agenta.
- **`DEMO_SPEC_TEMPLATE.md`**: 3-minutowy scenariusz prezentacji przed jury.
- **`.agents/skills/task/SKILL.md`**: Skill realizacyjny dla Google Antigravity.
