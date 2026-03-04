import os
from threading import Lock

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


BIELIK_MODEL_ID = "speakleash/Bielik-11B-v2.2-Instruct"
SYSTEM_PROMPT = (
    "Jesteś klasyfikatorem phishingu. Przeanalizuj tekst emaila i odpowiedz TYLKO "
    "'phishing' lub 'legit', nic więcej."
)

_cache_lock = Lock()
_cached_tokenizer: AutoTokenizer | None = None
_cached_model: AutoModelForCausalLM | None = None
_cached_device: torch.device | None = None


def _normalize_prediction(raw_text: str) -> str:
    text = raw_text.strip().lower()

    if "phishing" in text:
        return "phishing"

    if "legit" in text or "legitimate" in text or "bezpieczn" in text or "prawdziw" in text:
        return "legit"

    if text == "1":
        return "phishing"

    if text == "0":
        return "legit"

    return f"error: unrecognized Bielik output: {raw_text[:120]}"


def _load_model() -> tuple[AutoTokenizer, AutoModelForCausalLM, torch.device]:
    global _cached_tokenizer, _cached_model, _cached_device

    with _cache_lock:
        if _cached_tokenizer is not None and _cached_model is not None and _cached_device is not None:
            return _cached_tokenizer, _cached_model, _cached_device

        model_id = os.getenv("BIELIK_MODEL_ID") or BIELIK_MODEL_ID
        hf_token = os.getenv("HF_TOKEN", "").strip() or None

        tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        
        # Configure 4-bit quantization
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            token=hf_token,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True
        )

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.eval()

        _cached_tokenizer = tokenizer
        _cached_model = model
        _cached_device = device

        return tokenizer, model, device


def classify_with_bielik(email_text: str) -> str:
    """Classify email using Bielik-11B-v2.2-Instruct model with 4-bit quantization."""
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
            prompt = f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}\n\nOdpowiedź:"
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
