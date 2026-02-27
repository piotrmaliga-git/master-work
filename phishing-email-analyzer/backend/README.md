# Phishing E‑mail Analyzer

Aplikacja demonstracyjna i badawcza do oceny, jak dobrze nowoczesne modele językowe radzą sobie z rozpoznawaniem wiadomości phishingowych. Możesz wprowadzać treść e‑maila poprzez interfejs webowy lub przetwarzać całe zestawy danych, a system porówna wyniki czterech różnych modeli AI.

> **Ten plik pełni również rolę przewodnika instalacyjnego (setup guide).** Poniżej znajdziesz wszystkie informacje niezbędne do pobrania, uruchomienia i korzystania z aplikacji.

Celem projektu jest wsparcie pracy magisterskiej poprzez przygotowanie narzędzia, które testuje 4 modele:
GPT‑3.5 Turbo, GPT‑4 Turbo, GPT‑4.1 Turbo oraz Gemini 1.5 Pro, a także generuje metryki ich skuteczności.

---

## 🧩 Ogólna architektura

Aplikacja składa się z dwóch niezależnych warstw:

| Warstwa | Technologia | Port | Opis |
|--------|-------------|------|------|
| **Backend** | Python / FastAPI | 8000 | REST API do jednorazowej i wsadowej analizy maili, integracja z OpenAI i Google Gemini |
| **Frontend** | Angular 19+ (SSR ready) | 4200 | SPA z Server‑Side Rendering, Tailwind CSS, signal‑based architecture |

Dodatkowo istnieje skrypt eksperymentalny (`/backend/experiment.py`), który automatyzuje przetestowanie wszystkich 500 e‑maili datasetu na każdym z 4 modeli i generuje metryki.

Dane testowe znajdują się w `/data/data.json` – 500 wiadomości (250 phishing, 250 legit), po 10 kategorii w każdej grupie. Każdy wpis zawiera pole `sender` z adresem e‑mail nadawcy.

CORS jest włączony na backendzie, więc frontend może się z nim komunikować bezpośrednio w trybie dev.

---

## 📁 Struktura katalogów

```
backend/
├── main.py               # FastAPI server z endpointami /analyze i /analyze-batch
├── experiment.py          # skrypt do batch-testów wszystkich modeli
├── data.json              # 500 wiadomości z ground truth, kategorią i polem sender
├── requirements.txt       # zależności Pythona (fastapi, uvicorn, openai, etc.)
├── .env                   # (nieobecny w repo) klucze API
└── results/               # wynikowe pliki JSON z testów

frontend/
├── src/
│   ├── app/
│   │   ├── components/      # podkomponenty UI (standalone)
│   │   │   ├── analyzer/    # formularz, selector, przyciski
│   │   │   ├── results/     # karta wyniku
│   │   │   ├── info/        # opisy modeli
│   │   │   ├── header/      # nagłówek strony
│   │   │   └── footer/      # stopka strony
│   │   ├── pages/           # komponenty stron (routing)
│   │   ├── routes/          # definicje tras Angular Router
│   │   ├── services/        # ApiService do wywołań backendu
│   │   ├── models/          # interfejsy TS (EmailRequest, AnalysisResult)
│   │   ├── tests/           # testy jednostkowe
│   │   └── app.ts           # root standalone component
│   ├── styles/              # globalne style (Tailwind + custom)
│   ├── main.ts              # bootstrap aplikacji (CSR)
│   ├── main.server.ts       # bootstrap aplikacji (SSR)
│   ├── server.ts            # Express server dla SSR
│   └── index.html           # główny plik HTML
├── angular.json             # konfiguracja Angular CLI
├── tailwind.config.js       # konfiguracja Tailwind CSS
├── postcss.config.js        # konfiguracja PostCSS
├── .editorconfig            # ustawienia edytora
├── .prettierrc              # konfiguracja Prettier
└── package.json             # zależności Node
```

---

## 🛠 Backend – szczegóły

- **`main.py`** tworzy dwa endpointy:
  - `POST /analyze` – pojedynczy mail, argumenty `email_text`, `model_name` i `sender`; zwraca obiekt `{ model, sender, prediction, timestamp }`.
  - `POST /analyze-batch` – wykonuje analizę całego datasetu dla wszystkich czterech modeli, zapisuje plik wynikowy w `results/`.

- Używane biblioteki:
  - `fastapi`, `uvicorn` – serwer HTTP
  - `openai` – klient API OpenAI
  - `google-generativeai` – klient Gemini
  - `python-dotenv` – ładowanie `.env` z kluczami

- **System prompt** jest jednolity dla wszystkich modeli:

  > You are a phishing classifier. Analyze the email text and respond with ONLY 'phishing' or 'legit', nothing else.

- **Metryki** (w `experiment.py`) obliczane są po każdym modelu: accuracy, precision, recall, F1 oraz macierz pomyłek.

- Wynikowy JSON zawiera szczegóły per mail oraz zgrubną tabelę porównawczą.

---

## 🎨 Frontend – szczegóły

### Architektura

- **Standalone components** – wszystkie komponenty są `standalone: true`, bez `NgModule`.
- **Signal‑based state management** – komponenty wykorzystują Angular Signals (`signal()`, `input()`, `input.required()`, `output()`, `computed()`).
- **New control flow** – szablony używają `@if`, `@for`, `@switch` zamiast dyrektyw strukturalnych `*ngIf`, `*ngFor`, `[ngSwitch]`.
- **OnPush change detection** – wszystkie komponenty używają `ChangeDetectionStrategy.OnPush`.
- **SSR ready** – aplikacja posiada konfigurację Server‑Side Rendering (`main.server.ts`, `server.ts`).

### Komponenty

| Komponent | Opis |
|-----------|------|
| `AnalyzerComponent` | Formularz z polem na treść maila, adres nadawcy, selector modelu AI, przyciski Analyze/Clear. Używa `input.required()` dla `loading`, `input()` z aliasem dla `error`, `output()` dla `analyzeRequest`. |
| `ResultsComponent` | Renderuje kartę wyniku z modelem, nadawcą, predykcją i timestampem. Używa `input()` dla `result`. |
| `InfoComponent` | Statyczny opis dostępnych modeli AI. |
| `HeaderComponent` | Nagłówek strony. |
| `FooterComponent` | Stopka strony. |

### Routing

Aplikacja posiada routing zdefiniowany w `routes/` z osobnymi komponentami stron w `pages/`.

### Stylizacja

- **Tailwind CSS** – utility‑first framework do stylizacji.
- **PostCSS** – przetwarzanie styli.
- Globalne style w `src/styles/`.
- Kolory statusów: phishing → czerwony (`text-danger`), legit → zielony (`text-success`).

### Serwisy

- **`ApiService`** – enkapsuluje logikę HTTP, używa `fetch` poprzez `withFetch()` i bazowego URL `http://localhost:8000`.

### Testy

- Testy jednostkowe znajdują się w `src/app/tests/`.

---

## 🚀 Jak uruchomić

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Utwórz plik `.env` w katalogu `backend/`:

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

Uruchom serwer:

```bash
uvicorn main:app --reload
```

Po starcie: http://127.0.0.1:8000/docs udostępnia Swagger UI.

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

Aplikacja dostępna pod http://localhost:4200.

### 3. Eksperymenty wsadowe (opcjonalne)

```bash
cd backend
python experiment.py
```

Wyniki zapisywane są w `results/experiment_YYYYMMDD_HHMMSS.json`.

---

## 📊 Jak analizować wyniki

- Przeglądaj metryki w wygenerowanym JSON‑ie lub wyświetl tabelę w konsoli.
- Możesz analizować skuteczność wg kategorii (`category` w dataset).
- Porównuj modele pod kątem kosztów i czasu odpowiedzi.

---

## 🧠 Rozszerzenia i pomysły

- Przetestuj inne prompt engineering (modyfikacja `SYSTEM_PROMPT`).
- Dodaj front‑endową historię analiz lub eksport wyników do CSV.
- Zintegruj z bazą danych dla trwałego przechowywania.
- Dodaj logowanie i autoryzację.
- Rozbuduj testy jednostkowe i dodaj testy e2e.

---

## 🔧 Wymagania

| Narzędzie | Wersja |
|-----------|--------|
| Node.js | 20+ |
| Angular CLI | 19+ |
| Python | 3.10+ |
| npm | 10+ |