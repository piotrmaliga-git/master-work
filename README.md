# Phishing Email Analyzer (Temporary Monorepo README)

To jest tymczasowe, wspólne README dla całego projektu.

## Struktura

- `phishing-email-analyzer/backend` – API FastAPI + modele
- `phishing-email-analyzer/frontend` – aplikacja Angular
- `data` – dane wejściowe (`data.json` + zbiory CSV)
- `reports` – raporty/wyniki batch

## Wymagania

- Python 3.13+
- Node.js 20+
- npm 10+

## Backend (FastAPI)

### 1) Instalacja zależności

```powershell
cd "phishing-email-analyzer/backend"
py -3.13 -m pip install -r requirements.txt
```

### 2) Konfiguracja `.env`

Minimalnie:

- `OPENAI_API_KEY` (jeśli używasz modeli GPT)
- `GOOGLE_API_KEY` (jeśli używasz modeli Gemini)
- `HF_TOKEN` (dla modeli Hugging Face)
- `LLAMA_API_KEY` (jeśli używasz Llama Cloud)

### 3) Uruchomienie API

```powershell
cd "phishing-email-analyzer/backend"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Jeśli port `8000` jest zajęty, zakończ blokujący proces albo uruchom na innym porcie.

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

## Dostępne modele (API `model_name`)

- `gpt-3.5-turbo`
- `gpt-4.1`
- `gemini-2.0-flash`
- `gemini-2.5-pro`
- `llama-cloud`
- `bielik-4bit`
- `bielik2-4bit`
- `roberta-baseline`

## Batch i raporty

Wyniki batch są zapisywane do katalogu `reports`.

Przykład uruchomienia:

```powershell
cd "phishing-email-analyzer/backend"
py -3.13 batch_api_runner.py --model roberta-baseline
```

## Status

README jest tymczasowe i docelowo może zostać rozbite na bardziej szczegółową dokumentację modułów.
