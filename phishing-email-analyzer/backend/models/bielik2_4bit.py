import os
import re
from threading import Lock

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


BIELIK_MODEL_ID = os.getenv("BIELIK_2_4BIT_MODEL_ID", "speakleash/Bielik-11B-v2.2-Instruct")
SYSTEM_PROMPT = (
    "You are a phishing email classifier. "
    "Return exactly two lines and nothing else. "
    "Line 1: Classification: phishing or legit. "
    "Line 2: Reason: a short, concrete justification in at most two sentences."
)
FORMAT_REPAIR_PROMPT = (
    "Fix the response format. Return exactly two lines and nothing else:\n"
    "Classification: phishing or legit\n"
    "Reason: short justification in at most two sentences."
)

_cache_lock = Lock()
_cached_tokenizer: AutoTokenizer | None = None
_cached_model: AutoModelForCausalLM | None = None


def _normalize_reason(text: str, max_len: int = 220) -> str:
    compact = " ".join((text or "").split())
    if len(compact) <= max_len:
        return compact
    return compact[: max_len - 3].rstrip() + "..."


def _extract_prediction(raw_text: str) -> str:
    match = re.search(r"(?im)^\s*classification\s*:\s*(phishing|legit)\b", raw_text)
    if match:
        return match.group(1).lower()

    fallback_match = re.search(r"\b(phishing|legit|legitimate|safe)\b", raw_text.lower())
    if fallback_match:
        value = fallback_match.group(1)
        return "legit" if value in {"legitimate", "safe"} else value

    return "legit"


def _has_valid_format(raw_text: str) -> bool:
    text = (raw_text or "").strip()
    has_classification = bool(re.search(r"(?im)^\s*classification\s*:\s*(phishing|legit)\b", text))
    has_reason = bool(re.search(r"(?im)^\s*reason\s*:\s*.+", text))
    return has_classification and has_reason


def _parse_model_output(raw_text: str) -> tuple[str, str]:
    text = (raw_text or "").strip()
    prediction = _extract_prediction(text)

    reason_match = re.search(r"(?is)\breason\s*:\s*(.+)$", text)
    if reason_match:
        reason = reason_match.group(1).strip()
    else:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        non_classification = [
            line for line in lines if not re.match(r"(?i)^\s*classification\s*:", line)
        ]
        reason = non_classification[0] if non_classification else ""

    if not reason:
        reason = "The model did not provide an explicit justification."

    return prediction, _normalize_reason(reason)


def _build_prompt(email_text: str) -> str:
    return (
        "Analyze the email and return the classification and reason.\n"
        "Allowed classifications: phishing or legit.\n"
        "Required response format:\n"
        "Classification: <phishing|legit>\n"
        "Reason: <at most 2 sentences>\n\n"
        "Email body:\n"
        f"{email_text}"
    )


def _load_model() -> tuple[AutoTokenizer, AutoModelForCausalLM]:
    global _cached_tokenizer, _cached_model

    with _cache_lock:
        if _cached_tokenizer is not None and _cached_model is not None:
            return _cached_tokenizer, _cached_model

        hf_token = os.getenv("HF_TOKEN", "").strip() or None

        if not torch.cuda.is_available():
            raise RuntimeError("Bielik 4-bit inference requires CUDA-enabled PyTorch and a compatible GPU")

        tokenizer = AutoTokenizer.from_pretrained(BIELIK_MODEL_ID, token=hf_token)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )

        model = AutoModelForCausalLM.from_pretrained(
            BIELIK_MODEL_ID,
            token=hf_token,
            quantization_config=quantization_config,
            torch_dtype=torch.float16,
            device_map="auto",
            low_cpu_mem_usage=True,
        )
        model.eval()

        _cached_tokenizer = tokenizer
        _cached_model = model

        return tokenizer, model


def _generate_raw(messages: list[dict[str, str]], max_new_tokens: int = 80) -> str:
    tokenizer, model = _load_model()

    model_inputs = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
        return_dict=True,
    )
    model_inputs = {key: value.to(model.device) for key, value in model_inputs.items()}

    with torch.no_grad():
        output = model.generate(
            **model_inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=None,
            top_p=None,
            pad_token_id=tokenizer.eos_token_id,
        )

    input_len = model_inputs["input_ids"].shape[1]
    generated_tokens = output[0][input_len:]
    return tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()


def classify_with_bielik2(email_text: str, max_new_tokens: int = 80, max_retries: int = 2) -> tuple[str, str]:
    """Classify email text with Bielik 11B Instruct loaded in 4-bit mode."""
    try:
        base_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_prompt(email_text)},
        ]

        raw = _generate_raw(base_messages, max_new_tokens=max_new_tokens)
        if not _has_valid_format(raw):
            history = base_messages + [{"role": "assistant", "content": raw}]
            for _ in range(max_retries):
                retry_messages = history + [{"role": "user", "content": FORMAT_REPAIR_PROMPT}]
                raw_retry = _generate_raw(retry_messages, max_new_tokens=max_new_tokens)
                raw = raw_retry
                if _has_valid_format(raw):
                    break
                history.append({"role": "assistant", "content": raw_retry})

        prediction, reason = _parse_model_output(raw)
        return prediction, reason
    except Exception as error:
        return f"error: {str(error) or type(error).__name__}", str(error)