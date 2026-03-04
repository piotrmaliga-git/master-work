import asyncio
import json
import os
import time
from typing import Callable

from dotenv import load_dotenv

from models.bielik_4bit import classify_with_bielik
from models.bielik2_4bit import classify_with_bielik2
from models.gemini import classify_with_gemini
from models.gpt_4_1 import classify_with_gpt4_1
from models.llama_cloud import classify_with_llama
from models.mistral_7b import classify_with_mistral_7b
from models.roberta_large_mnli import classify_with_roberta

load_dotenv()


def _load_first_email() -> dict:
    backend_dir = os.path.dirname(__file__)
    workspace_root = os.path.abspath(os.path.join(backend_dir, "..", ".."))
    data_path = os.path.join(workspace_root, "data", "data.json")

    with open(data_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if not payload:
        raise ValueError("data/data.json is empty")

    first = payload[0]
    if "text" not in first:
        raise ValueError("First item in data/data.json has no 'text' field")

    return first


def _normalize_binary_label(value: str) -> str:
    text = (value or "").strip().lower()
    if "phishing" in text:
        return "phishing"
    if "legit" in text or "legitimate" in text:
        return "legit"
    return text


def _run_sync(name: str, fn: Callable[[str], str], email_text: str, ground_truth: str) -> dict:
    started = time.perf_counter()
    result = fn(email_text)
    elapsed = time.perf_counter() - started

    normalized = _normalize_binary_label(result)
    ok = normalized == ground_truth

    return {
        "model": name,
        "result": result,
        "normalized": normalized,
        "ok": ok,
        "seconds": elapsed,
    }


async def _run_async(name: str, email_text: str, ground_truth: str) -> dict:
    started = time.perf_counter()
    result = await classify_with_llama(email_text)
    elapsed = time.perf_counter() - started

    normalized = _normalize_binary_label(result)
    ok = normalized == ground_truth

    return {
        "model": name,
        "result": result,
        "normalized": normalized,
        "ok": ok,
        "seconds": elapsed,
    }


async def main() -> None:
    sample = _load_first_email()
    email_text = sample["text"]
    ground_truth = _normalize_binary_label(sample.get("ground_truth", ""))

    print("=" * 90)
    print("Testing all models on the first email from data/data.json")
    print("=" * 90)
    print(f"Email id: {sample.get('id', 'n/a')}")
    print(f"Sender: {sample.get('sender', 'n/a')}")
    print(f"Ground truth: {ground_truth}")
    print("-" * 90)

    results = []

    sync_models = [
        ("gpt-4.1", classify_with_gpt4_1),
        ("gemini-2.5-pro", lambda text: classify_with_gemini(text, "gemini-2.5-pro")),
        ("mistral-7b", classify_with_mistral_7b),
        ("bielik-4bit", classify_with_bielik),
        ("bielik2-4bit", classify_with_bielik2),
        ("roberta-baseline", classify_with_roberta),
    ]

    for name, fn in sync_models:
        print(f"Running {name}...")
        results.append(_run_sync(name, fn, email_text, ground_truth))

    print("Running llama-cloud...")
    results.append(await _run_async("llama-cloud", email_text, ground_truth))

    print("\n" + "=" * 90)
    print("Summary")
    print("=" * 90)
    for row in results:
        status = "PASS" if row["ok"] else "FAIL"
        print(
            f"{row['model']:<18} | {status:<4} | normalized={row['normalized']:<10} "
            f"| seconds={row['seconds']:.2f}"
        )
        print(f"  raw: {row['result']}")

    passed = sum(1 for r in results if r["ok"])
    print("-" * 90)
    print(f"Passed: {passed}/{len(results)}")


if __name__ == "__main__":
    asyncio.run(main())
