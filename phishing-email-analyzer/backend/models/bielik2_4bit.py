import os
from threading import Lock

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


# Bielik 2 Model Configuration (optional - defaults are set in code)
BIELIK_MODEL_ID = "speakleash/Bielik-11B-v2.2-Instruct"
BIELIK_LOAD_4BIT = False
BIELIK_TEMPERATURE = 0
BIELIK_MAX_TOKENS = 512
BIELIK_TOP_K = 100
BIELIK_TOP_P = 1.0

SYSTEM_PROMPT = """Jesteś ekspertem od wykrywania phishingu. Przeanalizuj wiadomość email i określ:
1. Klasyfikację: 'phishing' lub 'legit'
2. Szczegółowe wyjaśnienie dlaczego tak sklasyfikowałeś/aś wiadomość, wskazując konkretne czerwone flagi lub wskaźniki legalności.

Odpowiedź ustrukturyzuj w formacie:
Classification: [phishing/legit]
Reason: [Twoje szczegółowe wyjaśnienie]"""

_cache_lock = Lock()
_cached_tokenizer: AutoTokenizer | None = None
_cached_model: AutoModelForCausalLM | None = None
_cached_device: torch.device | None = None


def _normalize_prediction(raw_text: str) -> str:
    """Normalize model output to 'phishing' or 'legit'."""
    text = raw_text.strip().lower()

    # Check for negative phishing indicators first
    negative_indicators = [
        "nie zawiera oznak phishingu",
        "nie ma oznak phishingu",
        "brak oznak phishingu",
        "wiadomość jest legalna",
        "wiadomość wydaje się być legalna",
        "nie jest phishingiem",
        "legalna wiadomość",
        "autentyczna wiadomość",
    ]
    
    for indicator in negative_indicators:
        if indicator in text:
            return "legit"

    # Check for positive phishing indicators
    if "phishing" in text or "oszustwo" in text or "podejrzana" in text:
        return "phishing"

    if "legit" in text or "legalna" in text or "autentyczna" in text:
        return "legit"

    return f"error: unrecognized Bielik output: {raw_text[:120]}"


def _load_model() -> tuple[AutoTokenizer, AutoModelForCausalLM, torch.device]:
    """Load and cache Bielik model with 4-bit quantization."""
    global _cached_tokenizer, _cached_model, _cached_device

    with _cache_lock:
        if _cached_tokenizer is not None and _cached_model is not None and _cached_device is not None:
            return _cached_tokenizer, _cached_model, _cached_device

        model_id = os.getenv("BIELIK_MODEL_ID") or BIELIK_MODEL_ID
        hf_token = os.getenv("HF_TOKEN", "").strip() or None
        load_4_bit = os.getenv("BIELIK_LOAD_4BIT", str(BIELIK_LOAD_4BIT)).lower() == "true"
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Initialize tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        tokenizer.pad_token = tokenizer.eos_token

        # Configure 4-bit quantization (only if CUDA is available)
        quantization_config = None
        if load_4_bit and torch.cuda.is_available():
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.bfloat16
            )
            print("Loading model with 4-bit quantization on CUDA...")
        elif load_4_bit and not torch.cuda.is_available():
            print("WARNING: 4-bit quantization requires CUDA. Loading full model on CPU instead...")
            load_4_bit = False
        
        # Load model
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
            quantization_config=quantization_config,
            token=hf_token,
            low_cpu_mem_usage=True
        )

        # Only move to device if not using quantization (quantization handles device placement)
        if not quantization_config:
            model.to(device)
        
        model.eval()

        _cached_tokenizer = tokenizer
        _cached_model = model
        _cached_device = device

        return tokenizer, model, device


def classify_with_bielik2(email_text: str) -> tuple[str, str]:
    """Classify email using Bielik-11B-v2.2-Instruct model with 4-bit quantization.
    
    Returns:
        tuple[str, str]: (prediction, reason)
    """
    try:
        tokenizer, model, device = _load_model()

        # Prepare messages using chat template
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": email_text},
        ]

        # Apply chat template - using official HF approach
        inputs = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        ).to(model.device)

        # Generation parameters
        temperature = float(os.getenv("BIELIK_TEMPERATURE", str(BIELIK_TEMPERATURE)))
        max_tokens = int(os.getenv("BIELIK_MAX_TOKENS", str(BIELIK_MAX_TOKENS)))
        top_k = int(os.getenv("BIELIK_TOP_K", str(BIELIK_TOP_K)))
        top_p = float(os.getenv("BIELIK_TOP_P", str(BIELIK_TOP_P)))

        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=True if temperature > 0 else False,
                temperature=temperature if temperature > 0 else None,
                top_k=top_k,
                top_p=top_p,
                pad_token_id=tokenizer.eos_token_id,
            )

        # Decode only the newly generated tokens (not the input prompt)
        response_text = tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[-1]:],
            skip_special_tokens=True
        ).strip()
        
        # Parse the response
        prediction = "legit"
        reason = response_text
        
        # Extract classification and reason
        if "Classification:" in response_text and "Reason:" in response_text:
            parts = response_text.split("Reason:", 1)
            classification_part = parts[0].replace("Classification:", "").strip().lower()
            reason = parts[1].strip() if len(parts) > 1 else response_text
            
            prediction = _normalize_prediction(classification_part)
            
            # Handle error cases
            if prediction.startswith("error:"):
                # Fallback to full text analysis
                prediction = _normalize_prediction(response_text)
        else:
            # Fallback: analyze full text
            prediction = _normalize_prediction(response_text)
            reason = response_text
        
        # Clean up reason if it still contains error prefix
        if prediction.startswith("error:"):
            # Last resort: check for phishing keywords
            if "phishing" in response_text.lower() or "oszustwo" in response_text.lower():
                prediction = "phishing"
            else:
                prediction = "legit"
        
        return prediction, reason
        
    except Exception as e:
        return f"error: {str(e)}", str(e)
