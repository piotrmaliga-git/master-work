import os
from threading import Lock

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


ROBERTA_MODEL_ID = "FacebookAI/roberta-large-mnli"
_PHISHING_HYPOTHESIS = "This email is phishing."
_LEGIT_HYPOTHESIS = "This email is legitimate."

_cache_lock = Lock()
_cached_tokenizer: AutoTokenizer | None = None
_cached_model: AutoModelForSequenceClassification | None = None
_cached_device: torch.device | None = None
_cached_entailment_index: int | None = None


def _resolve_entailment_index(model: AutoModelForSequenceClassification) -> int:
    id2label = getattr(model.config, "id2label", {}) or {}
    for idx, label in id2label.items():
        if "entail" in str(label).lower():
            return int(idx)

    label2id = getattr(model.config, "label2id", {}) or {}
    for label, idx in label2id.items():
        if "entail" in str(label).lower():
            return int(idx)

    return int(model.config.num_labels - 1)


def _load_model() -> tuple[AutoTokenizer, AutoModelForSequenceClassification, torch.device, int]:
    global _cached_tokenizer, _cached_model, _cached_device, _cached_entailment_index

    with _cache_lock:
        if (
            _cached_tokenizer is not None
            and _cached_model is not None
            and _cached_device is not None
            and _cached_entailment_index is not None
        ):
            return _cached_tokenizer, _cached_model, _cached_device, _cached_entailment_index

        hf_token = os.getenv("HF_TOKEN", "").strip() or None

        tokenizer = AutoTokenizer.from_pretrained(ROBERTA_MODEL_ID, token=hf_token)
        model = AutoModelForSequenceClassification.from_pretrained(ROBERTA_MODEL_ID, token=hf_token)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()

        entailment_index = _resolve_entailment_index(model)

        _cached_tokenizer = tokenizer
        _cached_model = model
        _cached_device = device
        _cached_entailment_index = entailment_index

        return tokenizer, model, device, entailment_index


def _entailment_score(
    tokenizer: AutoTokenizer,
    model: AutoModelForSequenceClassification,
    device: torch.device,
    entailment_index: int,
    premise: str,
    hypothesis: str,
) -> float:
    encoded = tokenizer(
        premise,
        hypothesis,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    )
    encoded = {key: value.to(device) for key, value in encoded.items()}

    with torch.no_grad():
        logits = model(**encoded).logits

    probs = torch.softmax(logits, dim=-1)[0]
    return float(probs[entailment_index].item())


def classify_with_roberta(email_text: str) -> str:
    try:
        tokenizer, model, device, entailment_index = _load_model()

        phishing_score = _entailment_score(
            tokenizer,
            model,
            device,
            entailment_index,
            email_text,
            _PHISHING_HYPOTHESIS,
        )
        legit_score = _entailment_score(
            tokenizer,
            model,
            device,
            entailment_index,
            email_text,
            _LEGIT_HYPOTHESIS,
        )

        return "phishing" if phishing_score >= legit_score else "legit"
    except Exception as error:
        return f"error: {str(error)}"
