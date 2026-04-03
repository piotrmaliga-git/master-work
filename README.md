# Phishing Email Analyzer Repository

This repository combines two closely related parts of a master's thesis project:

- a full-stack phishing email analyzer application in `phishing-email-analyzer/`
- thesis materials, datasets, and experiment outputs used to document and evaluate that application

The main engineering work lives in the frontend and backend application. The remaining folders support research, reporting, and writing.

## Repository Structure

```text
.
├── data/                       # labeled email dataset used for evaluation
├── graduate work/              # LaTeX thesis sources and images
├── phishing-email-analyzer/
│   ├── backend/                # FastAPI API and model integrations
│   └── frontend/               # Angular SSR web application
└── reports/                    # saved model evaluation reports
```

## Main Application

The `phishing-email-analyzer/` directory contains the web application used to classify emails as `phishing` or `legit`.

### Frontend

The frontend is an Angular 21 SSR application with PrimeNG UI components.

Main frontend capabilities:

- email analysis form with fields for sender, title, email body, and AI model selection
- results view showing prediction, explanation, selected model, and response time
- English and Polish localized routes (`/en`, `/pl`)
- dark/light theme toggle persisted in `localStorage`
- unit tests, Playwright end-to-end tests, visual regression tests, and mutation testing

Key frontend characteristics:

- framework: Angular 21 with standalone components
- rendering: SSR-enabled Angular application
- UI: PrimeNG + Tailwind/PostCSS pipeline
- API integration: calls backend at `http://localhost:8000/analyze`

### Backend

The backend is a FastAPI application exposing an HTTP API for phishing analysis.

Main backend capabilities:

- loads multiple model integrations at startup
- exposes available/unavailable models through the root endpoint
- analyzes a single email through `POST /analyze`
- measures response time and returns structured analysis metadata
- includes scripts for batch testing and dataset shuffling/renumbering

Supported model integrations currently present in the codebase:

- `gpt-4.1`
- `gemini-2.5-pro`
- `mistral-7b`
- `llama-cloud`
- `bielik-2-4bit`

## Supporting Folders

- `data/data.json`: labeled dataset used for experiments and quick model comparisons
- `reports/`: saved JSON reports from model evaluation runs
- `graduate work/`: thesis text, bibliography, title/claims pages, and graphics

## Requirements

The repository does not currently pin toolchain versions globally, but the codebase implies these practical requirements:

- Node.js and npm for the Angular frontend
- Python 3.10+ for the FastAPI backend
- optional CUDA-capable GPU for efficient local Bielik 4-bit inference
- provider API keys for hosted models

## Quick Start

Run the frontend and backend in separate terminals.

### 1. Frontend setup

```powershell
cd .\phishing-email-analyzer\frontend
npm install
npm start
```

Default development URL:

- `http://localhost:4200`

Alternative localized dev command:

```powershell
npm run start:pl
```

### 2. Backend setup

```powershell
cd .\phishing-email-analyzer\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Default backend URL:

- `http://127.0.0.1:8000`

The frontend is hardcoded to call `http://localhost:8000`, so keep the backend available on port `8000` unless you also update the frontend API service.

## Environment Variables

Create a `.env` file in `phishing-email-analyzer/backend/` when running the backend from that directory.

Common variables used by the model integrations:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | required for `gpt-4.1` |
| `GOOGLE_API_KEY` | required for `gemini-2.5-pro` |
| `LLAMA_API_KEY` | required for `llama-cloud` |
| `HF_TOKEN` | optional/required depending on Hugging Face model access |
| `MISTRAL_7B_MODEL_ID` | optional override for the Mistral model id |
| `BIELIK_2_4BIT_MODEL_ID` | optional override for the Bielik model id |
| `LLAMA_CLASSIFY_TIMEOUT_SEC` | optional timeout for Llama Cloud classification |
| `LLAMA_CLASSIFY_MAX_RETRIES` | optional retry count for Llama Cloud classification |
| `LLAMA_CLASSIFY_RETRY_SLEEP_SEC` | optional retry backoff for Llama Cloud classification |

Example:

```env
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
LLAMA_API_KEY=your_llama_key
HF_TOKEN=your_huggingface_token
```

## API Contract

### `GET /`

Returns basic backend status, including:

- API message
- list of `available_models`
- `model_load_errors` for models that failed during startup

### `POST /analyze`

Request body:

```json
{
  "email_text": "Email body to analyze",
  "model_name": "gpt-4.1",
  "sender": "sender@example.com",
  "title": "Important account notice"
}
```

Response shape:

```json
{
  "model": "gpt-4.1",
  "prediction": "phishing",
  "reason": "Detailed explanation of the classification.",
  "timestamp": "2026-04-03T12:00:00.000000",
  "response_time_ms": 842.14,
  "sender": "sender@example.com",
  "title": "Important account notice"
}
```

Possible failure cases:

- unknown model name
- configured model unavailable during startup
- missing provider credentials
- inference/runtime errors inside a model adapter

## Development Commands

### Frontend

```powershell
npm start
npm run start:pl
npm run build
npm run build:pl
npm run test
npm run test:ci
npm run test:coverage
npm run lint
npm run e2e
npm run e2e:visual
npm run e2e:visual-rtl
npm run mutate
```

### Backend

```powershell
uvicorn main:app --reload
python test_all_models.py --samples 10
python shuffle_data.py --all
```

## Testing and Quality

Frontend quality tooling includes:

- ESLint
- Prettier
- Angular unit tests
- Playwright end-to-end tests
- Playwright visual regression tests
- Stryker mutation testing

Backend utilities include:

- `test_all_models.py` for quick multi-model comparisons on dataset samples
- `shuffle_data.py` for dataset maintenance

## Dataset and Evaluation

The dataset in `data/data.json` stores labeled email examples with fields:

- `id`
- `title`
- `sender`
- `text`
- `ground_truth`
- `category`

Ground-truth labels used across the repository are:

- `phishing`
- `legit`

Saved evaluation outputs are stored under `reports/` as JSON files, one per tested model/run.

## Notes and Limitations

- Local heavyweight models can require substantial memory and compute.
- `bielik-2-4bit` is intended for CUDA-enabled execution and is not a lightweight CPU path.
- Model availability is determined at backend startup; unavailable models are reported by the API.
- The frontend includes locale persistence through a request to `/api/locale`, but the SSR server file currently contains only the placeholder structure for custom Express endpoints.

## Thesis Context

The application is only one part of this repository. The rest of the workspace supports the research process:

- `graduate work/` contains the LaTeX source of the thesis
- `data/` contains experimental input data
- `reports/` contains generated outputs used for comparison and analysis

If you only want to run the software, focus on `phishing-email-analyzer/frontend` and `phishing-email-analyzer/backend`.# Master's work
## Comparative Analysis of Language Model Effectiveness in Detecting Phishing Emails

This repository contains a complete research and application project focused on phishing detection in email messages. It includes:

- a web application for analyzing emails and comparing LLM responses,
- a FastAPI backend that exposes classification endpoints,
- experimental data and model evaluation reports,
- LaTeX source files for the written part of the master's thesis.

The project can be used both as a local phishing-email analysis tool and as an environment for running comparative experiments on a prepared dataset.

## Table of Contents

- [Master's work](#masters-work)
  - [Comparative Analysis of Language Model Effectiveness in Detecting Phishing Emails](#comparative-analysis-of-language-model-effectiveness-in-detecting-phishing-emails)
  - [Table of Contents](#table-of-contents)
  - [Repository Overview](#repository-overview)
  - [Project Structure](#project-structure)
  - [Screenshots](#screenshots)
    - [Home Page - Analysis Form](#home-page---analysis-form)
    - [Analysis Results](#analysis-results)
    - [404 Page](#404-page)
    - [RTL Tests](#rtl-tests)
  - [Requirements](#requirements)
  - [Quick Start](#quick-start)
    - [1. Backend](#1-backend)
    - [2. Frontend](#2-frontend)
  - [Backend Configuration](#backend-configuration)
  - [Architecture](#architecture)
  - [API](#api)
    - [`GET /`](#get-)
    - [`POST /analyze`](#post-analyze)
  - [Models](#models)
  - [Frontend: Run and Quality](#frontend-run-and-quality)
    - [Run and Build](#run-and-build)
    - [Translations](#translations)
    - [Tests](#tests)
    - [Code Quality](#code-quality)
    - [Playwright E2E](#playwright-e2e)
    - [Visual Snapshot Tests](#visual-snapshot-tests)
    - [Mutation Testing](#mutation-testing)
  - [Backend Helper Scripts](#backend-helper-scripts)
    - [Model Comparison](#model-comparison)
    - [Shuffling and Renumbering Data](#shuffling-and-renumbering-data)
  - [CI and Git Hooks](#ci-and-git-hooks)
  - [Data and Reports](#data-and-reports)
    - [Input Data Format](#input-data-format)
    - [Reports](#reports)
  - [Thesis Materials](#thesis-materials)
  - [Current Limitations](#current-limitations)

## Repository Overview

The main application in this repository is Phishing Email Analyzer:

- the backend loads models and classifies email messages,
- the frontend provides the UI, routing, tests, and internationalization,
- the `data/` directory stores the experimental input dataset,
- the `reports/` directory stores JSON results from model runs,
- the `graduate work/` directory contains the LaTeX thesis sources and related assets.

## Project Structure

```text
.
|-- .github/
|   `-- workflows/                    # CI workflows
|-- .husky/                           # Git hooks
|-- data/
|   `-- data.json                     # dataset used in experiments
|-- graduate work/                    # LaTeX thesis sources and assets
|   |-- main.tex
|   |-- bibliografia.bib
|   `-- images/
|-- phishing-email-analyzer/
|   |-- backend/                      # FastAPI backend, model adapters, research scripts
|   |   |-- main.py
|   |   |-- test_all_models.py
|   |   `-- models/
|   `-- frontend/                     # Angular 21 app, tests, Playwright, linting
|       |-- src/
|       |-- e2e/
|       `-- package.json
|-- reports/                          # JSON reports from model runs
`-- README.md
```

## Screenshots

The screenshots below come from Playwright visual tests. Snapshots are stored in `phishing-email-analyzer/frontend/e2e-snapshots/`.

### Home Page - Analysis Form

| Light mode | Dark mode |
|---|---|
| ![Empty home page - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/home-page/light/home-empty.png) | ![Empty home page - dark mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/home-page/dark/home-empty.png) |
| ![Filled form - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/home-page/light/home-form-filled.png) | |
| ![Loading state - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/home-page/light/home-loading.png) | |

### Analysis Results

| Light mode | Dark mode |
|---|---|
| ![Phishing result - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/analyzer-results/light/result-phishing.png) | ![Phishing result - dark mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/analyzer-results/dark/result-phishing.png) |
| ![Legit result - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/analyzer-results/light/result-safe.png) | |
| ![Error result - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/analyzer-results/light/result-error.png) | |

### 404 Page

| Light mode |
|---|
| ![404 page - light mode](phishing-email-analyzer/frontend/e2e-snapshots/visual/not-found/light/not-found.png) |

### RTL Tests

| Analysis form - light mode | Results - light mode | 404 page - light mode |
|---|---|---|
| ![RTL form - light mode](phishing-email-analyzer/frontend/e2e-snapshots/RTL/analyzer/light/analyzer-empty-state.png) | ![RTL results - light mode](phishing-email-analyzer/frontend/e2e-snapshots/RTL/results/light/result-phishing.png) | ![RTL 404 page - light mode](phishing-email-analyzer/frontend/e2e-snapshots/RTL/not-found/light/not-found.png) |

## Requirements

- Python 3.13+
- Node.js 20+
- npm 11+
- optional GPU/CUDA support for heavier local models

## Quick Start

### 1. Backend

```powershell
cd "phishing-email-analyzer/backend"
py -3.13 -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at `http://127.0.0.1:8000`.

### 2. Frontend

In a second terminal:

```powershell
cd "phishing-email-analyzer/frontend"
npm install
npm start
```

By default, `npm start` runs the English application configuration at `http://localhost:4200`.

You can start the Polish version with:

```powershell
npm run start:pl
```

## Backend Configuration

Create a `.env` file in `phishing-email-analyzer/backend` and add only the keys required by the models you want to use locally.

```env
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
LLAMA_API_KEY=...
HF_TOKEN=...

# optional
MISTRAL_7B_MODEL_ID=mistralai/Mistral-7B-Instruct-v0.3
LLAMA_CLASSIFY_TIMEOUT_SEC=30
LLAMA_CLASSIFY_MAX_RETRIES=0
LLAMA_CLASSIFY_RETRY_SLEEP_SEC=1.5
```

Key mapping:

| Variable | Model / usage |
|---|---|
| `OPENAI_API_KEY` | `gpt-4.1` |
| `GOOGLE_API_KEY` | `gemini-2.5-pro` |
| `LLAMA_API_KEY` | `llama-cloud` |
| `HF_TOKEN` | `mistral-7b` and Hugging Face based local models |

## Architecture

- `phishing-email-analyzer/backend/main.py` dynamically loads model adapters from `backend/models/`.
- `phishing-email-analyzer/backend/main.py` exposes `GET /` and `POST /analyze`.
- `phishing-email-analyzer/frontend/src/app/` contains an Angular 21 application built with standalone components.
- The frontend supports localized routes for the English and Polish versions.
- Translation files are stored in `phishing-email-analyzer/frontend/src/locale/`.
- Test data lives in `data/data.json`, and evaluation reports are stored in `reports/*.json`.

## API

### `GET /`

Returns basic API information, the list of successfully loaded models, and any model-loading errors captured during backend startup.

Example response:

```json
{
  "message": "Phishing Detection API",
  "available_models": ["gpt-4.1", "mistral-7b", "llama-cloud", "gemini-2.5-pro"],
  "model_load_errors": {}
}
```

### `POST /analyze`

Example request:

```json
{
  "email_text": "Email body...",
  "model_name": "gpt-4.1",
  "sender": "Bank <no-reply@bank.pl>",
  "title": "Confirm your details"
}
```

Example response:

```json
{
  "model": "gpt-4.1",
  "prediction": "phishing",
  "reason": "...",
  "timestamp": "2026-03-11T22:17:38.123456",
  "response_time_ms": 842.31,
  "sender": "Bank <no-reply@bank.pl>",
  "title": "Confirm your details"
}
```

Supported classification labels are `phishing` and `legit`.

## Models

| Model ID | Description |
|---|---|
| `gpt-4.1` | OpenAI model used as a qualitative reference point. |
| `gemini-2.5-pro` | Google model used for classification and reasoning. |
| `mistral-7b` | Open-source model run locally through `transformers`. |
| `llama-cloud` | Model accessed through the Llama Cloud service. |
| `bielik-2-4bit` | Optional local variant loaded only if the adapter file exists in the repository. |

## Frontend: Run and Quality

The main commands available in `phishing-email-analyzer/frontend` are listed below.

### Run and Build

```powershell
npm start
npm run start:pl
npm run build
npm run build:pl
npm run watch
```

### Translations

```powershell
npm run extract-i18n
```

This command generates the source XLF translation file in `src/locale/`.

### Tests

```powershell
npm test
npm run test:ci
npm run test:coverage
```

### Code Quality

```powershell
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

The frontend uses:

- ESLint 9 with flat config,
- `angular-eslint` for Angular 21,
- Prettier for formatting,
- Playwright for end-to-end testing,
- Vitest and the Angular test runner for unit tests.

### Playwright E2E

```powershell
npx playwright install
npm run e2e
npm run e2e:ui
npm run e2e:headed
npm run e2e:report
```

### Visual Snapshot Tests

Visual tests use two configurations:

- the default configuration (`playwright.config.ts`) writes snapshots to `phishing-email-analyzer/frontend/e2e-snapshots/visual/`,
- the RTL configuration (`playwright.rtl.config.ts`) writes snapshots to `phishing-email-analyzer/frontend/e2e-snapshots/RTL/`.

Generate or refresh snapshot PNG files with:

```powershell
cd "phishing-email-analyzer/frontend"
npm run e2e:update-snapshots
npm run e2e:update-snapshots-rtl
```

Run tests that compare the UI with existing snapshots with:

```powershell
npm run e2e:visual
npm run e2e:visual-rtl
```

### Mutation Testing

```powershell
npm run mutate
npm run mutate:dry
```

Mutation test reports are generated in `phishing-email-analyzer/frontend/reports/mutation/`.

## Backend Helper Scripts

### Model Comparison

```powershell
cd "phishing-email-analyzer/backend"

py -3.13 test_all_models.py
py -3.13 test_all_models.py --models gpt-4.1,gemini-2.5-pro,llama-cloud
py -3.13 test_all_models.py --samples 50 --seed 7
```

### Shuffling and Renumbering Data

```powershell
cd "phishing-email-analyzer/backend"

py -3.13 shuffle_data.py
py -3.13 shuffle_data.py --shuffle
py -3.13 shuffle_data.py --renumber
py -3.13 shuffle_data.py --all
```

If no flags are provided, `shuffle_data.py` performs both operations: shuffling and ID renumbering.

## CI and Git Hooks

The repository includes local and remote quality checks:

- `.husky/pre-push` blocks `git push` if frontend `build`, `format:check`, or `lint` fails.
- `.github/workflows/pr-frontend-ci.yml` runs frontend checks for pull requests, including build, linting, translation checks, unit tests, E2E tests, visual tests, RTL visual tests, and mutation testing.
- `.github/workflows/merge-frontend-ci.yml` runs the frontend validation pipeline on pushes to `main` and `master`.
- `.github/workflows/pr-backend-ci.yml` performs a backend syntax check with Python 3.13.

## Data and Reports

### Input Data Format

The `data/data.json` file stores records with at least the following fields:

- `id`
- `title`
- `sender`
- `text`
- `ground_truth` (`phishing` or `legit`)
- `category`

### Reports

The `reports/` directory stores JSON output generated by model runs, for example:

- `gpt_4.1_report_*.json`
- `gemini_2.5-pro_report_*.json`
- `llama_cloud_report_*.json`
- `mistral_report_*.json`
- `bielik2_(4bit)_report_*.json`

## Thesis Materials

The written thesis sources are stored in `graduate work/`:

- `main.tex` - main LaTeX document,
- `title_page.tex`, `claims_page.tex`, `settings.tex`,
- `bibliografia.bib`,
- `images/`.

## Current Limitations

- The `bielik-2-4bit` adapter is optional, and the backend loads it only if `backend/models/bielik2_4bit.py` exists.
- Local `transformers`-based models may be slow without GPU acceleration.
- The backend exposes startup model-loading failures through `model_load_errors`, so partial model availability does not block the whole API from starting.