# Phishing Email Analyzer

## Struktura projektu

```
phishing-email-analyzer/
  backend/          – API FastAPI + modele AI
  frontend/         – aplikacja Angular
data/               – zbiór danych (data.json)
reports/            – wyniki testów modeli
```

## Wymagania

- Python 3.13+
- Node.js 20+, npm 11+

## Backend (FastAPI)

### 1) Instalacja zależności

```powershell
cd "phishing-email-analyzer/backend"
py -3.13 -m pip install -r requirements.txt
```

### 2) Konfiguracja `.env`

Wymagane klucze API (w zależności od używanych modeli):

| Zmienna           | Model                  |
|-------------------|------------------------|
| `OPENAI_API_KEY`  | GPT-4.1                |
| `GOOGLE_API_KEY`  | Gemini 2.5 Pro         |
| `HF_TOKEN`        | Mistral 7B, Bielik 2   |
| `LLAMA_API_KEY`   | Llama Cloud            |

### 3) Uruchomienie API

```powershell
cd "phishing-email-analyzer/backend"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API dostępne pod `http://localhost:8000`.

### 4) Testowanie modeli

Uruchom wszystkie modele na próbce danych:

```powershell
cd "phishing-email-analyzer/backend"
py -3.13 test_all_models.py
```

Opcje:

```powershell
# Konkretne modele
py -3.13 test_all_models.py --models gpt-4.1,gemini-2.5-pro

# Więcej próbek
py -3.13 test_all_models.py --samples 50
```

## Frontend (Angular)

### 1) Instalacja zależności

```powershell
cd "phishing-email-analyzer/frontend"
npm install
```

### 2) Uruchomienie

```powershell
cd "phishing-email-analyzer/frontend"
npm start
```

Aplikacja komunikuje się z backendem pod `http://localhost:8000`.

### 3) Testy jednostkowe

```powershell
npm test            # tryb watch
npm run test:ci     # jednorazowo
npm run test:coverage
```

### 4) Testy E2E (Playwright)

```powershell
npx playwright install
npm run e2e
npm run e2e:ui      # interaktywny runner
npm run e2e:headed  # widoczna przeglądarka
npm run e2e:report  # podgląd raportu HTML
```

## Narzędzia pomocnicze

### Testowanie modeli (`test_all_models.py`)

Uruchamia wszystkie (lub wybrane) modele na próbce emaili i wyświetla dokładność każdego z nich.

```powershell
cd "phishing-email-analyzer/backend"

# Wszystkie modele, 10 próbek (domyślnie)
py -3.13 test_all_models.py

# Wybrane modele
py -3.13 test_all_models.py --models gpt-4.1,gemini-2.5-pro

# Więcej próbek, inny seed
py -3.13 test_all_models.py --samples 50 --seed 7
```

Wynik zawiera per-sample status (✓/✗) oraz tabelę podsumowującą całość.

### Tasowanie danych (`shuffle_data.py`)

Tasuje kolejność emaili w `data/data.json` i/lub przenumerowuje ich ID.

```powershell
cd "phishing-email-analyzer/backend"

# Obie operacje naraz (domyślnie)
py -3.13 shuffle_data.py

# Tylko tasowanie
py -3.13 shuffle_data.py --shuffle

# Tylko przenumerowanie
py -3.13 shuffle_data.py --renumber

# Własna ścieżka do pliku
py -3.13 shuffle_data.py --file "../../data/data.json"
```

## Dostępne modele

| Model ID         | Opis                                         |
|------------------|----------------------------------------------|
| `gpt-4.1`        | OpenAI GPT-4.1                               |
| `gemini-2.5-pro` | Google Gemini 2.5 Pro                        |
| `mistral-7b`     | Mistral 7B Instruct (HuggingFace Inference)  |
| `llama-cloud`    | Meta Llama (Llama Cloud API)                 |
| `bielik-2-4bit`  | Bielik 11B v2.2 (lokalnie, 4-bit kwantyzacja)|
