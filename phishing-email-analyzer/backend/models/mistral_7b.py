import os
from threading import Lock

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


MISTRAL_7B_MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.3"
SYSTEM_PROMPT = (
    "You are a phishing classifier. Analyze the email text and respond with ONLY "
    "'phishing' or 'legit', nothing else."
)

_cache_lock = Lock()
_cached_tokenizer: AutoTokenizer | None = None
_cached_model: AutoModelForCausalLM | None = None
_cached_device: torch.device | None = None


def _normalize_prediction(raw_text: str) -> str:
    text = raw_text.strip().lower()

    if "phishing" in text:
        return "phishing"

    if "legit" in text or "legitimate" in text or "safe" in text:
        return "legit"

    if text == "1":
        return "phishing"

    if text == "0":
        return "legit"

    return f"error: unrecognized Mistral output: {raw_text[:120]}"


def _load_model() -> tuple[AutoTokenizer, AutoModelForCausalLM, torch.device]:
    global _cached_tokenizer, _cached_model, _cached_device

    with _cache_lock:
        if _cached_tokenizer is not None and _cached_model is not None and _cached_device is not None:
            return _cached_tokenizer, _cached_model, _cached_device

        model_id = os.getenv("MISTRAL_7B_MODEL_ID") or MISTRAL_7B_MODEL_ID
        hf_token = os.getenv("HF_TOKEN", "").strip() or None

        tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        model = AutoModelForCausalLM.from_pretrained(model_id, token=hf_token)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()

        _cached_tokenizer = tokenizer
        _cached_model = model
        _cached_device = device

        return tokenizer, model, device


def classify_with_mistral_7b(email_text: str) -> str:
    """Classify email using Mistral 7B Instruct model from Hugging Face."""
    try:
        tokenizer, model, device = _load_model()

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": email_text},
        ]

        try:
            encoded = tokenizer.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_tensors="pt",
            )
            # BatchEncoding is dict-like but not an actual dict
            input_ids = encoded.get("input_ids", encoded)
            attention_mask = encoded.get("attention_mask", None)
        except Exception:
            prompt = f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}\n\nAnswer:"
            encoded_fallback = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
            input_ids = encoded_fallback["input_ids"]
            attention_mask = encoded_fallback.get("attention_mask", None)

        input_ids = input_ids.to(device)
        if attention_mask is not None:
            attention_mask = attention_mask.to(device)
        pad_token_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        if pad_token_id is None:
            raise ValueError("Tokenizer has no pad/eos token id")

        with torch.no_grad():
            outputs = model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_new_tokens=16,
                do_sample=False,
                pad_token_id=pad_token_id,
            )

        generated = outputs[0][input_ids.shape[-1]:]
        raw = tokenizer.decode(generated, skip_special_tokens=True).strip()
        return _normalize_prediction(raw)
    except Exception as error:
        return f"error: {str(error) or type(error).__name__}"
