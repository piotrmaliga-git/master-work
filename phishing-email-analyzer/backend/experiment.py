import json
import os
from datetime import datetime
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Models to test
MODELS = {
    "gpt-3.5-turbo": "openai",
    "gpt-4-turbo": "openai",
    "gpt-4.1-turbo": "openai",
    "gemini-1.5-pro": "gemini"
}

SYSTEM_PROMPT = "You are a phishing classifier. Respond with ONLY 'phishing' or 'legit', nothing else."


def classify_with_openai(email_text: str, model: str) -> str:
    """Classify email using OpenAI."""
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
        print(f"OpenAI Error: {e}")
        return "error"


def classify_with_gemini(email_text: str, model: str) -> str:
    """Classify email using Gemini."""
    try:
        model_obj = genai.GenerativeModel(model)
        response = model_obj.generate_content(
            f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}"
        )
        return response.text.strip().lower()
    except Exception as e:
        print(f"Gemini Error: {e}")
        return "error"


def calculate_metrics(ground_truths, predictions):
    """Calculate accuracy, precision, recall, and F1 score."""
    tp = fp = fn = tn = 0

    for gt, pred in zip(ground_truths, predictions):
        if gt == "phishing" and pred == "phishing":
            tp += 1
        elif gt == "legit" and pred == "phishing":
            fp += 1
        elif gt == "phishing" and pred == "legit":
            fn += 1
        elif gt == "legit" and pred == "legit":
            tn += 1

    total = tp + tn + fp + fn

    accuracy = (tp + tn) / total if total > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn
    }


# Load dataset
print("Loading dataset...")
dataset_path = os.path.join(os.path.dirname(__file__), "..", "data", "data.json")
with open(dataset_path, "r", encoding="utf-8") as f:
    dataset = json.load(f)

print(f"Dataset loaded: {len(dataset)} emails")
print(f"Testing {len(MODELS)} models...")
print("-" * 80)

# Store all results
all_results = {
    "timestamp": datetime.utcnow().isoformat(),
    "total_emails": len(dataset),
    "models": list(MODELS.keys()),
    "metrics": {}
}

# Test each model
for model_name, provider in MODELS.items():
    print(f"\nTesting {model_name}...")

    predictions = []
    ground_truths = []

    for idx, email in enumerate(dataset):
        if provider == "openai":
            prediction = classify_with_openai(email["text"], model_name)
        else:
            prediction = classify_with_gemini(email["text"], model_name)

        predictions.append(prediction)
        ground_truths.append(email["ground_truth"])

        if (idx + 1) % 50 == 0:
            print(f"  Progress: {idx + 1}/{len(dataset)}")

    # Calculate metrics
    metrics = calculate_metrics(ground_truths, predictions)
    all_results["metrics"][model_name] = metrics

    print(f"  Accuracy:  {metrics['accuracy']}")
    print(f"  Precision: {metrics['precision']}")
    print(f"  Recall:    {metrics['recall']}")
    print(f"  F1 Score:  {metrics['f1_score']}")

# Print comparison table
print("\n" + "=" * 80)
print("COMPARISON TABLE")
print("=" * 80)
print(f"{'Model':<25} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1 Score':<12}")
print("-" * 80)

for model_name, metrics in all_results["metrics"].items():
    print(
        f"{model_name:<25} "
        f"{metrics['accuracy']:<12.4f} "
        f"{metrics['precision']:<12.4f} "
        f"{metrics['recall']:<12.4f} "
        f"{metrics['f1_score']:<12.4f}"
    )

print("=" * 80)

# Save results
os.makedirs("results", exist_ok=True)
filename = f"results/experiment_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

with open(filename, "w", encoding="utf-8") as f:
    json.dump(all_results, f, indent=2, ensure_ascii=False)

print(f"\nResults saved to: {filename}")
