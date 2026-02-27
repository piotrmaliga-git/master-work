# Phishing E‑mail Analyzer

Aplikacja demonstracyjna i badawcza do oceny, jak dobrze nowoczesne modele językowe radzą sobie z rozpoznawaniem wiadomości phishingowych.

Celem projektu jest wsparcie pracy magisterskiej poprzez przygotowanie narzędzia, które testuje 4 modele:
**GPT‑3.5 Turbo**, **GPT‑4 Turbo**, **GPT‑4.1 Turbo** oraz **Gemini 1.5 Pro**, a także generuje metryki ich skuteczności.

---

## 🧩 Architektura

| Warstwa | Technologia | Port | README |
|---------|-------------|------|--------|
| **Backend** | Python / FastAPI | 8000 | [backend/README.md](./backend/README.md) |
| **Frontend** | Angular 19+ / Tailwind CSS | 4200 | [frontend/README.md](./frontend/README.md) |

---

## ⚡ Szybki start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Utwórz .env z kluczami OPENAI_API_KEY i GOOGLE_API_KEY
uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

### 3. Otwórz przeglądarkę

http://localhost:4200

---

## 📊 Dataset

500 wiadomości e‑mail (250 phishing + 250 legit) w 10 kategoriach. Plik: `backend/data/data.json`.

---

## 🧪 Eksperymenty

```bash
cd backend
python experiment.py
```

Generuje metryki (accuracy, precision, recall, F1) i macierze pomyłek dla każdego modelu.

---

## 🔧 Wymagania

| Narzędzie | Wersja |
|-----------|--------|
| Node.js | 20+ |
| Angular CLI | 19+ |
| Python | 3.10+ |
| npm | 10+ |

---

Szczegółowa dokumentacja w README każdej warstwy:
- 🔙 [Backend](./backend/README.md)
- 🎨 [Frontend](./frontend/README.md)