import os
import json
import re
import time
from datetime import datetime
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.bielik_4bit import classify_with_bielik
from models.bielik2_4bit import classify_with_bielik2
from models.gemini import classify_with_gemini
from models.gpt_4_1 import classify_with_gpt4_1
from models.llama_cloud import classify_with_llama
from models.mistral_7b import classify_with_mistral_7b
from models.roberta_large_mnli import classify_with_roberta

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

BACKEND_DIR = os.path.dirname(__file__)
PROJECT_ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
WORKSPACE_ROOT_DIR = os.path.abspath(os.path.join(PROJECT_ROOT_DIR, ".."))
REPORTS_DIR = os.path.join(WORKSPACE_ROOT_DIR, "reports")
DATASET_PATH = os.path.join(WORKSPACE_ROOT_DIR, "data", "data.json")
os.makedirs(REPORTS_DIR, exist_ok=True)

class EmailRequest(BaseModel):
    email_text: str
    model_name: str = "gpt-3.5-turbo"
    sender: str
    title: str


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
            "gpt-4.1",
            "gemini-2.5-pro",
            "llama-cloud",
            "mistral-7b",
            "bielik-4bit",
            "bielik2-4bit",
            "roberta-baseline"
        ]
    }


@app.post("/analyze")
async def analyze_email(request: EmailRequest):
    """Analyze a single email."""
    model = request.model_name
    
    # Start timing
    start_time = time.time()

    # Call the appropriate model
    if model == "gpt-4.1":
        result = classify_with_gpt4_1(request.email_text)
    elif model == "mistral-7b":
        result = classify_with_mistral_7b(request.email_text)
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

    # Handle both tuple (prediction, reason) and string returns
    if isinstance(result, tuple):
        prediction, reason = result
    else:
        prediction = result
        reason = None
    
    # Check for errors
    if isinstance(prediction, str) and prediction.startswith("error:"):
        raise HTTPException(status_code=400, detail=prediction)

    # Use model's reason if available, otherwise fallback to pattern-based reason
    if not reason:
        reason = build_decision_reason(request.email_text, prediction)
    
    # Calculate response time
    end_time = time.time()
    response_time_ms = round((end_time - start_time) * 1000, 2)

    response = {
        "model": model,
        "prediction": prediction,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat(),
        "response_time_ms": response_time_ms,
        "sender": request.sender,
        "title": request.title
    }
    return response


@app.post("/test-all-models")
async def test_models_endpoint(request: EmailRequest):
    """Test all available models on a given email."""
    return await test_all_models(request.email_text)


@app.post("/analyze-batch")
async def analyze_batch(batch_request: dict):
    """Analyze multiple emails with all available models."""
    models = [
        "gpt-4.1",
        "gemini-2.5-pro",
        "llama-cloud",
        "mistral-7b",
        "bielik-4bit",
        "bielik2-4bit",
        "roberta-baseline"
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
            try:
                if model == "gpt-4.1":
                    prediction = classify_with_gpt4_1(email["text"])
                elif model == "mistral-7b":
                    prediction = classify_with_mistral_7b(email["text"])
                elif model.startswith("gemini"):
                    prediction = classify_with_gemini(email["text"], model)
                elif model.startswith("llama"):
                    prediction = await classify_with_llama(email["text"])
                elif model.startswith("bielik2"):
                    prediction = classify_with_bielik2(email["text"])
                elif model.startswith("bielik"):
                    prediction = classify_with_bielik(email["text"])
                elif model.startswith("roberta"):
                    prediction = classify_with_roberta(email["text"])
                else:
                    prediction = "error: Unknown model"
            except Exception as e:
                prediction = f"error: {str(e)}"

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