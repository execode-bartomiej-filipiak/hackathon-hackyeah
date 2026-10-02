# TASK_TEMPLATE.md — Szablon Zadania dla Agenta Antigravity

Używaj tego szablonu do zlecania zadań w oknie agenta lub twórz nowe pliki zadań w zespole. Agent jest zobowiązany do postępowania zgodnie z poniższymi sekcjami.

---

## Szablon Pusty (skopiuj i uzupełnij)

```markdown
# Zadanie: [Krótki tytuł zadania]

### 1. Kontekst biznesowy / cel dla jury
- Dlaczego to robimy: [1 zdanie, jaki efekt zobaczy jury]
- Powiązanie z architekturą: [np. nowa akcja w app/actions/ lub nowy widok w components/]

### 2. Plan plików (OBOWIĄZKOWE przed edycją kodu)
Agent MUSI wypisać plan przed dotknięciem kodu:
- [ ] Utworzyć: `...`
- [ ] Zmodyfikować: `...`
- [ ] Przetestować: `...`

### 3. Wymagany rezultat
- [Opis co ma powstać — bez stubów, pełna implementacja]
- Obsługa błędów / fallback: [co się dzieje, gdy Supabase nie odpowie]

### 4. Kryteria akceptacji (obserwowalne w UI)
- [ ] Użytkownik widzi ...
- [ ] Kliknięcie w przycisk [...] wywołuje toast `...`
- [ ] W trybie offline (?demo=true) funkcjonalność działa bez błędu
- [ ] Brak błędów w konsoli przeglądarki

### 5. Komendy weryfikacyjne w bashu
Po zakończeniu implementacji agent uruchamia w terminalu:
- `npm run typecheck`
- `npm run build`
```

---

## Przykład Wypełniony (Referencyjny)

```markdown
# Zadanie: Dodanie formularza szybkiego zgłoszenia usterki z przyciskiem przykładowych danych

### 1. Kontekst biznesowy / cel dla jury
- Jury musi zobaczyć możliwość błyskawicznego dodania nowej usterki w 5 sekund podczas prezentacji, bez ręcznego wpisywania długiego tekstu.
- Zmiana dotyczy modułu dashboardu i wymaga nowej Server Action `createIssue`.

### 2. Plan plików
- [ ] Utworzyć: `types/issue.ts` (typ Issue oraz NewIssue)
- [ ] Utworzyć: `app/actions/issues.ts` (Server Action z revalidatePath)
- [ ] Zmodyfikować: `components/dashboard/issue-form.tsx` (obsługa useTransition, sonner toast, przycisk [✨ Wypełnij przykładowe dane])
- [ ] Zmodyfikować: `mock/demo-data.ts` (dopisanie 3 przykładowych zestawów danych do szybkiego wypełnienia)
- [ ] Przetestować: kompilację i przejście builda

### 3. Wymagany rezultat
- Pełny formularz z polami: Tytuł (Input), Kategoria (Select), Priorytet (Badge/Select), Opis (Textarea).
- Przycisk `[✨ Wypełnij przykładowe dane]` rotacyjnie wstawia przygotowane zestawy danych.
- Zapis przez Server Action `createIssue`. W trybie demo rekord trafia natychmiast do lokalnego stanu i pojawia się w tabeli.

### 4. Kryteria akceptacji
- [ ] Formularz renderuje się bez ostrzeżeń hydracji.
- [ ] Kliknięcie `[✨ Wypełnij przykładowe dane]` wypełnia pola wartościami testowymi.
- [ ] Wysłanie formularza wyświetla zielony toast sonner: "Zgłoszenie zostało zarejestrowane".
- [ ] Nowy rekord natychmiast aktualizuje licznik w kafelkach KPI.
- [ ] Tryb `?demo=true` pozwala na dodanie rekordu bez połączenia z Supabase.

### 5. Komendy weryfikacyjne w bashu
- `npm run typecheck`
- `npm run build`
```
