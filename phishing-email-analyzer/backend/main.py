import os
import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

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
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

# System prompt for phishing classification
SYSTEM_PROMPT = "You are a phishing classifier. Analyze the email text and respond with ONLY 'phishing' or 'legit', nothing else."


from typing import Optional

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
        model_obj = genai.GenerativeModel(model)
        response = model_obj.generate_content(
            f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}"
        )
        return response.text.strip().lower()
    except Exception as e:
        return f"error: {str(e)}"


@app.get("/")
async def root():
    return {
        "message": "Phishing Detection API",
        "available_models": [
            "gpt-3.5-turbo",
            "gpt-4-turbo",
            "gpt-4.1-turbo",
            "gemini-1.0-pro",
            "gemini-1.5-pro"
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
    else:
        return {"error": "Unknown model"}

    response = {
        "model": model,
        "prediction": result,
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
        "gpt-4-turbo",
        "gpt-4.1-turbo",
        "gemini-1.5-pro"
    ]

    # load dataset from centralized data folder
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "data", "data.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    all_results = {
        "timestamp": datetime.utcnow().isoformat(),
        "models": models,
        "results": []
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

        all_results["results"].append(email_result)

        # Print progress
        if (idx + 1) % 50 == 0:
            print(f"Processed {idx + 1}/{len(dataset)} emails...")

    # Save results
    filename = f"{RESULTS_DIR}/batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    return {
        "message": "Batch analysis completed",
        "saved_to": filename,
        "total_emails": len(dataset),
        "models_tested": models
    }