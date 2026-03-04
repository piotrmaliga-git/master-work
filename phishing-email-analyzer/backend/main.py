import os
import json
import re
from datetime import datetime
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from openai import OpenAI
from pydantic import BaseModel

from models.bielik import classify_with_bielik, classify_with_bielik2
from models.llama import classify_with_llama
from models.roberta import classify_with_roberta

load_dotenv()

app = FastAPI()

# CORS configuration for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

BACKEND_DIR = os.path.dirname(__file__)
PROJECT_ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
WORKSPACE_ROOT_DIR = os.path.abspath(os.path.join(PROJECT_ROOT_DIR, ".."))
REPORTS_DIR = os.path.join(WORKSPACE_ROOT_DIR, "reports")
DATASET_PATH = os.path.join(WORKSPACE_ROOT_DIR, "data", "data.json")
os.makedirs(REPORTS_DIR, exist_ok=True)

# System prompt for phishing classification
SYSTEM_PROMPT = "You are a phishing classifier. Analyze the email text and respond with ONLY 'phishing' or 'legit', nothing else."

class EmailRequest(BaseModel):
    email_text: str
    model_name: str = "gpt-3.5-turbo"
    sender: Optional[str] = None


def classify_with_openai(email_text: str, model: str) -> str:
    """Classify email using OpenAI models."""
    try:
        response = openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": email_text}
            ],
            temperature=0
        )
        return response.choices[0].message.content.strip().lower()
    except Exception as e:
        return f"error: {str(e)}"


def classify_with_gemini(email_text: str, model: str) -> str:
    """Classify email using Google Gemini models."""
    try:
        response = gemini_client.models.generate_content(
            model=model,
            contents=f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}"
        )
        return response.text.strip().lower()
    except Exception as e:
        return f"error: {str(e)}"


def build_decision_reason(email_text: str, prediction: str) -> str:
    text = email_text.lower()
    signals: list[str] = []

    urgency_patterns = [
        r"pilnie",
        r"natychmiast",
        r"urgent",
        r"immediately",
        r"asap",
        r"w\s*24h",
    ]
    credential_patterns = [
        r"has[łl]o",
        r"password",
        r"login",
        r"logowania",
        r"konto",
        r"account",
        r"verify",
        r"potwierd[źz]",
    ]
    action_patterns = [
        r"kliknij",
        r"click",
        r"link",
        r"za[łl][ąa]cznik",
        r"attachment",
        r"zaloguj",
        r"log in",
    ]

    if any(re.search(pattern, text) for pattern in urgency_patterns):
        signals.append("presja czasu")

    if any(re.search(pattern, text) for pattern in credential_patterns):
        signals.append("prośba o dane logowania lub weryfikację konta")

    if any(re.search(pattern, text) for pattern in action_patterns):
        signals.append("nakłanianie do szybkiej akcji (link/kliknięcie/logowanie)")

    if prediction == "phishing":
        if signals:
            return "Model wskazał phishing, ponieważ wykryto sygnały ryzyka: " + ", ".join(signals) + "."
        return "Model wskazał phishing na podstawie ogólnego wzorca oszustwa w treści wiadomości."

    if signals:
        return (
            "Model wskazał legit, ale wykryto pewne sygnały ryzyka: "
            + ", ".join(signals)
            + ". Warto zachować ostrożność."
        )

    return "Model wskazał legit, ponieważ treść nie zawiera typowych oznak phishingu (presji czasu, próśb o dane ani podejrzanych wezwań do działania)."


@app.get("/")
async def root():
    return {
        "message": "Phishing Detection API",
        "available_models": [
            "gpt-3.5-turbo",
            "gpt-4.1",
            "gemini-2.0-flash",
            "gemini-2.5-pro",
            "llama-cloud",
            "bielik-4bit",
            "bielik2-4bit",
            "roberta-baseline"
        ]
    }


@app.post("/analyze")
async def analyze_email(request: EmailRequest):
    """Analyze a single email."""
    model = request.model_name

    if model.startswith("gpt"):
        result = classify_with_openai(request.email_text, model)
    elif model.startswith("gemini"):
        result = classify_with_gemini(request.email_text, model)
    elif model.startswith("llama"):
        result = await classify_with_llama(request.email_text)
    elif model.startswith("bielik2"):
        result = classify_with_bielik2(request.email_text)
    elif model.startswith("bielik"):
        result = classify_with_bielik(request.email_text)
    elif model.startswith("roberta"):
        result = classify_with_roberta(request.email_text)
    else:
        return {"error": "Unknown model"}

    if result.startswith("error:"):
        raise HTTPException(status_code=400, detail=result)

    response = {
        "model": model,
        "prediction": result,
        "reason": build_decision_reason(request.email_text, result),
        "timestamp": datetime.utcnow().isoformat()
    }
    if request.sender:
        response["sender"] = request.sender
    return response


@app.post("/analyze-batch")
async def analyze_batch(batch_request: dict):
    """Analyze multiple emails with all 4 models."""
    models = [
        "gpt-3.5-turbo",
        "gpt-4.1",
        "gemini-2.0-flash",
        "gemini-2.5-pro"
    ]

    # load dataset from workspace-root data folder
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    batch_report = {
        "timestamp": datetime.utcnow().isoformat(),
        "models": models,
        "items": []
    }

    for idx, email in enumerate(dataset):
        email_result = {
            "id": email.get("id"),
            "text": email.get("text"),
            "sender": email.get("sender"),
            "ground_truth": email.get("ground_truth"),
            "category": email.get("category", "unknown"),
            "predictions": {}
        }

        for model in models:
            if model.startswith("gpt"):
                prediction = classify_with_openai(email["text"], model)
            else:
                prediction = classify_with_gemini(email["text"], model)

            email_result["predictions"][model] = prediction

        batch_report["items"].append(email_result)

        # Print progress
        if (idx + 1) % 50 == 0:
            print(f"Processed {idx + 1}/{len(dataset)} emails...")

    # Save results
    filename = os.path.join(REPORTS_DIR, f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(batch_report, f, indent=2, ensure_ascii=False)

    return {
        "message": "Batch analysis completed",
        "saved_to": filename,
        "total_emails": len(dataset),
        "models_tested": models
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000)