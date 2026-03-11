"""
test_all_models.py — run all 5 models on a sample of emails and print accuracy.

Usage:
    python test_all_models.py [--samples N] [--models gpt-4.1,mistral-7b,...]

Defaults: 10 samples, all models.
"""

import argparse
import importlib.util
import json
import os
import random
import sys
import time

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
DATASET_PATH = os.path.abspath(os.path.join(BACKEND_DIR, "..", "..", "data", "data.json"))

# ---------------------------------------------------------------------------
# Model loader (reuse the same helper as main.py)
# ---------------------------------------------------------------------------
def load_model_module(module_name: str, file_path: str):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ALL_MODELS = {
    "gpt-4.1": lambda: load_model_module("gpt_4_1", os.path.join(MODELS_DIR, "gpt_4.1.py")).classify_with_gpt4_1,
    "gemini-2.5-pro": lambda: (
        lambda text: load_model_module("gemini", os.path.join(MODELS_DIR, "gemini_2.5-pro.py"))
        .classify_with_gemini(text, "gemini-2.5-pro")
    ),
    "mistral-7b": lambda: load_model_module("mistral_7b", os.path.join(MODELS_DIR, "mistral_7b.py")).classify_with_mistral_7b,
    "llama-cloud": lambda: load_model_module("llama_cloud", os.path.join(MODELS_DIR, "llama_cloud.py")).classify_with_llama_cloud,
    "bielik-2-4bit": lambda: load_model_module("bielik2_4bit", os.path.join(MODELS_DIR, "bielik2_4bit.py")).classify_with_bielik2,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_samples(n: int) -> list[dict]:
    with open(DATASET_PATH, encoding="utf-8") as f:
        data = json.load(f)
    random.shuffle(data)
    return data[:n]


def run_model(name: str, classify_fn, samples: list[dict]) -> dict:
    results = []
    for sample in samples:
        t0 = time.time()
        try:
            prediction, reason = classify_fn(sample["text"])
        except Exception as e:
            prediction, reason = f"error: {e}", ""
        elapsed_ms = round((time.time() - t0) * 1000, 1)

        correct = prediction == sample.get("ground_truth", "")
        results.append({
            "id": sample["id"],
            "ground_truth": sample.get("ground_truth", "?"),
            "prediction": prediction,
            "reason": reason,
            "correct": correct,
            "elapsed_ms": elapsed_ms,
        })

        status = "✓" if correct else ("!" if prediction.startswith("error") else "✗")
        print(f"  [{status}] id={sample['id']:>4}  gt={sample.get('ground_truth','?'):<8}  pred={prediction:<8}  {elapsed_ms:.0f}ms")

    correct_count = sum(r["correct"] for r in results)
    accuracy = correct_count / len(results) * 100 if results else 0.0
    return {"results": results, "accuracy": accuracy, "correct": correct_count, "total": len(results)}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Test all phishing-detection models")
    parser.add_argument("--samples", type=int, default=10, help="Number of emails to test per model (default: 10)")
    parser.add_argument("--models", type=str, default="", help="Comma-separated list of models to run (default: all)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for sample selection (default: 42)")
    args = parser.parse_args()

    random.seed(args.seed)

    selected = [m.strip() for m in args.models.split(",") if m.strip()] if args.models else list(ALL_MODELS.keys())
    unknown = [m for m in selected if m not in ALL_MODELS]
    if unknown:
        print(f"Unknown model(s): {', '.join(unknown)}")
        print(f"Available: {', '.join(ALL_MODELS.keys())}")
        sys.exit(1)

    samples = load_samples(args.samples)
    print(f"Loaded {len(samples)} samples from dataset.\n")

    summary = {}
    for model_name in selected:
        print(f"{'='*60}")
        print(f"Model: {model_name}")
        print(f"{'='*60}")
        classify_fn = ALL_MODELS[model_name]()
        stats = run_model(model_name, classify_fn, samples)
        summary[model_name] = stats
        print(f"  → Accuracy: {stats['correct']}/{stats['total']} ({stats['accuracy']:.1f}%)\n")

    print(f"{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"{'Model':<20} {'Correct':>8} {'Total':>6} {'Accuracy':>10}")
    print("-" * 50)
    for model_name, stats in summary.items():
        print(f"{model_name:<20} {stats['correct']:>8} {stats['total']:>6} {stats['accuracy']:>9.1f}%")


if __name__ == "__main__":
    main()
