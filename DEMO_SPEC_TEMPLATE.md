# DEMO_SPEC_TEMPLATE.md — Specyfikacja Prezentacji dla Jury (2–3 minuty)

Wypełnij ten dokument po ogłoszeniu tematu hackathonu lub doprecyzowaniu pomysłu. Dokument służy jako scenariusz dla zespołu i wytyczne dla agenta.

---

## 1. Karta Projektu

- **Nazwa projektu**: [UZUPEŁNIJ np. EcoFleet AI / Diagnostyka Pro / QuickResolve]
- **Jednozdaniowa wartość (Elevator Pitch)**: [UZUPEŁNIJ np. Skracamy czas diagnostyki awarii z 4 godzin do 30 sekund dzięki analizie telemetrii w czasie rzeczywistym.]
- **Główny problem użytkownika**: [UZUPEŁNIJ np. Użytkownik nie wie, dlaczego maszyna stanęła i traci tysiące złotych na przestoju.]
- **Dla kogo (grupa docelowa)**: [UZUPEŁNIJ np. Operatorzy maszyn, dyspozytorzy floty, kierownicy produkcji]

---

## 2. Główne Założenia Demonstracji

- **ZERO ekranów logowania**: Aplikacja startuje od razu w stanie zalogowanym z pełnymi uprawnieniami administratora/eksperta.
- **Odporność na brak Wi-Fi na scenie**: Aplikacja działa z Supabase, ale przy braku połączenia natychmiast serwuje deterministyczne mocki z `mock/demo-data.ts`.
- **Awaryjny tryb offline**: Dopisanie w pasku adresu `?demo=true` wymusza 100% działanie lokalne bez żadnego zapytania sieciowego.
- **Szybkie wprowadzanie danych**: Główny formularz posiada przycisk `[✨ Wypełnij przykładowe dane]`. Podczas prezentacji prelegent nie wpisuje tekstu z klawiatury.
- **Reset do stanu fabrycznego**: Przycisk `[Resetuj dane demo]` przywraca bazę do stanu początkowego (seed) w 1 sekundę przed kolejną rundą pytań jury.

---

## 3. Scenariusz Klik po Kliku (Czas: 2:30 min)

| Czas | Co mówi prelegent | Co robi prelegent na ekranie | Oczekiwany efekt w aplikacji |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:30** | Krótki wstęp: problem, strata finansowa/czasowa, nasza teza. | Otwiera główny pulpit aplikacji. | Pulpit z 3 kafelkami KPI i listą bieżących danych. Brak jakichkolwiek ekranów logowania. |
| **0:30 - 1:15** | Pokazanie problemu w praktyce i wywołanie kluczowej akcji ("Efekt WOW"). | Klika przycisk `[✨ Wypełnij przykładowe dane]`, a następnie zatwierdza formularz. | Pola formularza wypełniają się w mgnieniu oka, zielony toast potwierdza zapis, wskaźniki KPI natychmiast przeliczają się na żywo. |
| **1:15 - 1:50** | Pokazanie ekranu wynikowego / analizy AI / generacji raportu. | Klika nowo dodany rekord lub przechodzi do widoku szczegółowego. | Otwarcie widoku szczegółowego z wygenerowanymi rekomendacjami i podsumowaniem. |
| **1:50 - 2:20** | Podsumowanie korzyści biznesowych i perspektywy wdrożenia. | Wskazuje kafelki metryk i podsumowanie. | Jury widzi wyliczoną oszczędność / metryki operacyjne. |
| **2:20 - 2:30** | Podziękowanie i przygotowanie do pytań. | Klika `[Resetuj dane demo]` (opcjonalnie). | Stan aplikacji wraca do czystego demo. |

---

## 4. Ekran Wynikowy — 3 Kluczowe Metryki Biznesowe (KPI)

Te 3 liczby muszą rzucać się w oczy jury zaraz po wejściu na pulpit:
1. **[UZUPEŁNIJ np. Aktywne zgłoszenia / Zbadane incydenty]**: `[UZUPEŁNIJ np. 14]`
2. **[UZUPEŁNIJ np. Szacowana oszczędność / Wartość zgłoszeń]**: `[UZUPEŁNIJ np. 48 500 PLN]`
3. **[UZUPEŁNIJ np. Skuteczność / Wskaźnik rozwiązania]**: `[UZUPEŁNIJ np. 94.2%]`

---

## 5. Checklista Przed Wejściem na Prezentację

- [ ] Zmienne środowiskowe skonfigurowane w projekcie na Vercel Production.
- [ ] Skrypt `supabase/schema.sql` oraz `supabase/seed.sql` wykonane w Supabase SQL Editor.
- [ ] Sprawdzono działanie aplikacji w trybie normalnym oraz z flagą `?demo=true`.
- [ ] Brak błędów w konsoli przeglądarki (F12).
- [ ] Build na Vercelu jest zielony (ostatni commit wdrożony).
- [ ] **PLAN B**: Nagrane 60-sekundowe wideo z przejścia scenariusza (Loom / nagranie ekranu w pliku `.mp4`) zapisane lokalnie na pulpicie laptopa.

---

## 6. Anti-Scope — Czego Kategorycznie NIE Robimy w Projekcie

Każda z poniższych rzeczy kradnie czas i **nie daje żadnych punktów u jury hackathonu**:
- ❌ Rejestracja, logowanie, reset hasła, integracja z Google OAuth, JWT, profile użytkownika.
- ❌ Płatności Stripe, koszyk, subskrypcje, faktury.
- ❌ Paginacja wielostronicowa (wystarczy scrollowalna lista 10–20 rekordów).
- ❌ Regulaminy, zgody cookies, polityka prywatności, RODO.
- ❌ Wielojęzyczność (i18n) — trzymamy się wyłącznie języka polskiego w UI.
- ❌ Przełącznik Dark Mode (wybierz jeden dopracowany motyw).
- ❌ Rozbudowany panel administracyjny z zarządzaniem rolami i uprawnieniami.
- ❌ Wysyłka e-maili i SMS-ów przez zewnętrzne bramki.
