# Formularz Zgłoszeniowy HackYeah 2026 — Smart City

Pola do skopiowania do formularza na platformie:

---

### Project Name

```text
CommuteScore 3D
```

---

### Problem

```text
Wybierając mieszkanie lub biuro, patrzymy na cenę za m² i zdjęcia, ignorując realny czas dojazdów. W Krakowie kierowcy tracą średnio ponad 120 godzin rocznie w zatorach (TomTom Traffic Index). Tradycyjne mapy 2D nie pozwalają szybko ocenić dojazdu z jednego adresu do kilku prywatnych celów jednocześnie (praca, szkoła dzieci, rodzina, siłownia).
```

---

### Solution

```text
Interaktywna mapa 3D Krakowa wyliczająca tygodniowy bilans czasu dojazdów z dowolnego wskazanego budynku do spersonalizowanych celów użytkownika.

Kluczowe funkcje:
- Routing i estymacja czasów dla 4 środków transportu: MPK (tramwaj/autobus), samochód, rower, pieszo.
- Wskaźnik (0-100) oraz bilans zaoszczędzonych godzin w skali tygodnia i roku.
- Dynamiczne, animowane trajektorie 3D łączące budynek z celami.
- Wskazywanie celów celownikiem na mapie 3D z automatycznym odczytem adresu (ulica i numer).
- Wyszukiwarka krakowskich adresów z płynnym przelotem kamery.
```

---

### Challenges

```text
OPEN TASK: SMART CITY
```

---

### Idea stage

```text
Work on progress project
```

---

### What's done so far and goal of your project

```text
Przed hackathonem:
Czysty szablon Next.js 16 + Supabase.

Zrealizowano w trakcie hackathonu (100% funkcji):
- Pełnoekranowa mapa 3D Krakowa w WebGL z bryłami budynków.
- Routing po siatce drogowej i estymacja czasów dla 4 środków lokomocji.
- Animowane trajektorie 3D (60 FPS) i przestrzenne etykiety nad celami.
- Odwrotne geokodowanie (wykrywanie ulicy i numeru po kliknięciu w bryłę 3D).
- Tryb dodawania i edycji celów celownikiem bezpośrednio na mapie.
- Panel analityczny HUD wyliczający CommuteScore i bilans czasu.
- Wyszukiwarka adresów w Krakowie.
- Wdrożenie produkcyjne na Vercelu.
```

---

### Team status

```text
Full team
```

---

### Current team size

```text
2
```

---

### Needed skills

*(zostaw puste / brak)*

---

### Skills comment

```text
N/A — 2-osobowy zespół zrealizował projekt w całości.
```

---

### Your video presentation (Public or Listed YouTube link)

```text
https://www.youtube.com/watch?v=HsMPE8g4VbI
```

---

### Website (https://...)

```text
https://hackathon-hackyeah.vercel.app
```

---

### Code Repository

```text
https://github.com/execode-bartomiej-filipiak/hackathon-hackyeah
```

---

### Instructions on how to open project

```markdown
1. Wersja online (bez instalacji):
https://hackathon-hackyeah.vercel.app (działa od razu w przeglądarce, zero logowania).

2. Szybki test dla Jury:
- Kliknij przycisk demo na Rynku Głównym lub dowolny budynek w 3D na mapie.
- Zobacz wyliczone czasy dojazdu i wskaźnik CommuteScore w panelu po prawej.
- Zmień środek transportu przy wybranym celu (MPK / Auto / Rower / Pieszo).
- Kliknij [+ Dodaj nowy cel na mapie] i wskaż celownikiem dowolny punkt w Krakowie.
- Przetestuj wyszukiwarkę w lewym górnym rogu (np. wpisz "Mogilska").

3. Uruchomienie lokalne (opcjonalnie):
git clone https://github.com/execode-bartomiej-filipiak/hackathon-hackyeah.git
cd hackathon-hackyeah
git checkout dev
npm install
npm run dev
(dostępne pod http://localhost:3000)
```
