import os
import tempfile
import time
from threading import Lock

from llama_cloud import LlamaCloud

_CLASSIFICATION_RULES = [
    {
        "type": "phishing",
        "description": (
            "The message is likely phishing, scam, or social engineering. "
            "It includes suspicious links, credential/payment requests, urgency, "
            "impersonation, or pressure to perform risky actions."
        ),
    },
    {
        "type": "legit",
        "description": (
            "The message appears legitimate and does not contain common phishing "
            "signals such as credential theft attempts, malicious links, or social "
            "engineering pressure."
        ),
    },
]

_cache_lock = Lock()
_llama_client: LlamaCloud | None = None


def _get_float_env(name: str, default: float) -> float:
    value = os.getenv(name, str(default)).strip()
    try:
        parsed = float(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def _get_int_env(name: str, default: int) -> int:
    value = os.getenv(name, str(default)).strip()
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed >= 0 else default


def _get_llama_client() -> LlamaCloud:
    global _llama_client

    with _cache_lock:
        if _llama_client is None:
            api_key = os.getenv("LLAMA_API_KEY", "").strip()
            if not api_key:
                raise ValueError("LLAMA_API_KEY is missing in environment")
            _llama_client = LlamaCloud(api_key=api_key)

        return _llama_client


def _normalize_prediction(raw_prediction: str, raw_reasoning: str) -> str:
    text = f"{raw_prediction} {raw_reasoning}".lower()

    # Check for negative phishing indicators first (when model says it's NOT phishing)
    negative_indicators = [
        "no red flags for phishing",
        "no obvious phishing",
        "no phishing indicators",
        "not phishing",
        "appears to be legitimate",
        "appears legitimate",
        "strongly suggest this is a legitimate",
        "legitimate institutional communication",
        "legitimate travel",
        "legitimate newsletter",
        "legitimate communication",
        "legitimate it notification",
    ]
    
    for indicator in negative_indicators:
        if indicator in text:
            return "legit"

    # Check for positive phishing indicators
    positive_indicators = [
        "phishing attempt",
        "phishing indicators",
        "this is a phishing",
        "clearly indicates this is a phishing",
        "strongly indicate this is a phishing",
        "exhibits multiple classic phishing",
        "classic phishing indicators",
        "common phishing tactic",
        "typical phishing",
    ]
    
    for indicator in positive_indicators:
        if indicator in text:
            return "phishing"

    # Fallback: check raw_prediction type from API
    raw_pred_lower = raw_prediction.lower().strip()
    if raw_pred_lower in ["phishing", "scam", "suspicious"]:
        return "phishing"
    if raw_pred_lower in ["legit", "legitimate", "safe", "benign"]:
        return "legit"

    # If still unsure, default to legit to avoid false positives
    return "legit"


def classify_with_llama_cloud(email_text: str) -> tuple[str, str]:
    """Classify email text using Llama Cloud classifier.

    Returns:
        tuple[str, str]: (prediction, reason)
    """
    temp_path = ""
    file_id = None

    classify_timeout_sec = _get_float_env("LLAMA_CLASSIFY_TIMEOUT_SEC", 30.0)
    max_retries = _get_int_env("LLAMA_CLASSIFY_MAX_RETRIES", 0)
    retry_sleep_sec = _get_float_env("LLAMA_CLASSIFY_RETRY_SLEEP_SEC", 1.5)

    try:
        client = _get_llama_client()

        # Classifier works on uploaded files, so we pass email body as a temporary text file.
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as tmp:
            tmp.write(email_text)
            temp_path = tmp.name

        uploaded = client.files.create(file=temp_path, purpose="classify")
        file_id = uploaded.id

        result = None
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                result = client.classifier.classify(
                    file_ids=[file_id],
                    rules=_CLASSIFICATION_RULES,
                    mode="FAST",
                    timeout=classify_timeout_sec,
                )
                break
            except Exception as error:  # noqa: PERF203 - network call with explicit retry policy
                last_error = error
                message = str(error).lower()
                is_timeout = "timeout" in message or "timed out" in message or "deadline" in message

                if is_timeout and attempt < max_retries:
                    # Backoff reduces repeated hammering when remote queue is overloaded.
                    time.sleep(retry_sleep_sec * (attempt + 1))
                    continue

                break

        if result is None:
            error_text = str(last_error) if last_error else "unknown llama classify error"
            return f"error: {error_text}", (
                "Llama Cloud classify failed. "
                f"timeout={classify_timeout_sec}s, retries={max_retries}, error={error_text}"
            )

        if not result.items:
            return "error: llama returned no classification items", "No items in classify response"

        item_result = result.items[0].result
        if item_result is None:
            return "error: llama returned empty result", "Result field is empty"

        raw_prediction = item_result.type or ""
        reasoning = (item_result.reasoning or "").strip()
        prediction = _normalize_prediction(raw_prediction, reasoning)

        if not reasoning:
            reasoning = (
                "Llama Cloud classifier returned a label without detailed reasoning. "
                f"Raw label: {raw_prediction or 'unknown'}."
            )

        return prediction, reasoning

    except Exception as error:
        return f"error: {str(error) or type(error).__name__}", str(error)

    finally:
        if file_id:
            try:
                _get_llama_client().files.delete(file_id)
            except Exception:
                pass

        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
