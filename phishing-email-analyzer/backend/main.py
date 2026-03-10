import os
import time
from datetime import datetime
import importlib.util

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import models using importlib.util for non-standard names
def load_model_module(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Get the models directory path
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Load all models
gpt_4_1_module = load_model_module('gpt_4_1', os.path.join(MODELS_DIR, 'gpt_4.1.py'))
classify_with_gpt4_1 = gpt_4_1_module.classify_with_gpt4_1

gemini_module = load_model_module('gemini', os.path.join(MODELS_DIR, 'gemini_2.5-pro.py'))
classify_with_gemini = gemini_module.classify_with_gemini

mistral_module = load_model_module('mistral_7b', os.path.join(MODELS_DIR, 'mistral_7b.py'))
classify_with_mistral_7b = mistral_module.classify_with_mistral_7b

llama_cloud_module = load_model_module('llama_cloud', os.path.join(MODELS_DIR, 'llama_cloud.py'))
classify_with_llama_cloud = llama_cloud_module.classify_with_llama_cloud

bielik2_module = load_model_module('bielik2_4bit', os.path.join(MODELS_DIR, 'bielik2_4bit.py'))
classify_with_bielik2 = bielik2_module.classify_with_bielik2

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

class EmailRequest(BaseModel):
    email_text: str
    model_name: str = "gpt-4.1"
    sender: str
    title: str


@app.get("/")
async def root():
    return {
        "message": "Phishing Detection API",
        "available_models": [
            "gpt-4.1",
            "gemini-2.5-pro",
            "mistral-7b",
            "llama-cloud",
            "bielik-2-4bit"
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
    elif model == "gemini-2.5-pro":
        result = classify_with_gemini(request.email_text, model)
    elif model == "mistral-7b":
        result = classify_with_mistral_7b(request.email_text)
    elif model == "llama-cloud":
        result = classify_with_llama_cloud(request.email_text)
    elif model == "bielik-2-4bit":
        result = classify_with_bielik2(request.email_text)
    else:
        return {"error": "Unknown model"}

    prediction, reason = result

    if isinstance(prediction, str) and prediction.startswith("error:"):
        raise HTTPException(status_code=400, detail=prediction)

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000)