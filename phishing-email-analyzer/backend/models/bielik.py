import os
import traceback
from collections.abc import Mapping
from threading import Lock

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


BIELIK_SYSTEM_PROMPT = (
	"Jesteś klasyfikatorem phishingu. "
	"Przeanalizuj treść e-maila i odpowiedz WYŁĄCZNIE jednym słowem: phishing albo legit."
)

MODEL_ALIAS_TO_ENV = {
	"bielik-4bit": "BIELIK_MODEL_ID",
	"bielik2-4bit": "BIELIK2_MODEL_ID",
}

MODEL_ALIAS_TO_ID = {
	"bielik-4bit": "speakleash/Bielik-7B-Instruct-v0.1",
	"bielik2-4bit": "speakleash/Bielik-11B-v2.3-Instruct",
}

_model_cache: dict[str, tuple[AutoTokenizer, AutoModelForCausalLM]] = {}
_cache_lock = Lock()


def _resolve_model_device(model: AutoModelForCausalLM) -> torch.device:
	try:
		return next(model.parameters()).device
	except StopIteration:
		return torch.device("cpu")


def _normalize_prediction(raw_text: str) -> str:
	text = raw_text.strip().lower()

	if "phishing" in text:
		return "phishing"

	if "legit" in text or "legitimate" in text or "bezpiecz" in text:
		return "legit"

	if text == "1":
		return "phishing"

	if text == "0":
		return "legit"

	return f"error: unrecognized Bielik output: {raw_text[:80]}"


def _decode_generation(tokenizer: AutoTokenizer, outputs: torch.Tensor, input_len: int) -> str:
	generated = outputs[0][input_len:]
	raw = tokenizer.decode(generated, skip_special_tokens=True).strip()
	if raw:
		return raw

	full_text = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
	return full_text[-200:] if full_text else ""


def _build_inputs(tokenizer: AutoTokenizer, email_text: str) -> torch.Tensor:
	messages = [
		{"role": "system", "content": BIELIK_SYSTEM_PROMPT},
		{"role": "user", "content": email_text},
	]

	if hasattr(tokenizer, "apply_chat_template"):
		try:
			return tokenizer.apply_chat_template(
				messages,
				tokenize=True,
				add_generation_prompt=True,
				return_tensors="pt",
			)
		except Exception:
			pass

	prompt = f"{BIELIK_SYSTEM_PROMPT}\n\nEmail:\n{email_text}\n\nOdpowiedź:"
	return tokenizer(prompt, return_tensors="pt")["input_ids"]


def _move_inputs_to_device(inputs, device: torch.device):
	if isinstance(inputs, Mapping):
		return {key: value.to(device) for key, value in inputs.items()}
	return inputs.to(device)


def _load_model(model_alias: str) -> tuple[AutoTokenizer, AutoModelForCausalLM]:
	if model_alias not in MODEL_ALIAS_TO_ID:
		raise ValueError(f"Unsupported Bielik alias: {model_alias}")

	env_key = MODEL_ALIAS_TO_ENV.get(model_alias)
	model_id = os.getenv(env_key) if env_key else None
	if not model_id:
		model_id = MODEL_ALIAS_TO_ID[model_alias]

	hf_token = os.getenv("HF_TOKEN")

	with _cache_lock:
		if model_alias in _model_cache:
			return _model_cache[model_alias]

		tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True, token=hf_token)
		if torch.cuda.is_available():
			quant_config = BitsAndBytesConfig(
				load_in_4bit=True,
				bnb_4bit_quant_type="nf4",
				bnb_4bit_use_double_quant=True,
				bnb_4bit_compute_dtype=torch.bfloat16,
			)
			model = AutoModelForCausalLM.from_pretrained(
				model_id,
				quantization_config=quant_config,
				device_map="auto",
				trust_remote_code=True,
				token=hf_token,
			)
		else:
			model = AutoModelForCausalLM.from_pretrained(
				model_id,
				device_map="cpu",
				trust_remote_code=True,
				token=hf_token,
			)

		_model_cache[model_alias] = (tokenizer, model)
		return tokenizer, model


def classify_with_bielik_alias(email_text: str, model_alias: str) -> str:
	try:
		tokenizer, model = _load_model(model_alias)
		inputs = _build_inputs(tokenizer, email_text)
		inputs = _move_inputs_to_device(inputs, _resolve_model_device(model))

		if isinstance(inputs, Mapping):
			input_ids = inputs["input_ids"]
			generate_source = {"input_ids": input_ids}
			if "attention_mask" in inputs:
				generate_source["attention_mask"] = inputs["attention_mask"]
		else:
			input_ids = inputs
			generate_source = {"input_ids": inputs}

		pad_token_id = tokenizer.pad_token_id or tokenizer.eos_token_id
		if pad_token_id is None:
			raise ValueError("Tokenizer has no pad/eos token id")

		outputs = model.generate(
			**generate_source,
			max_new_tokens=12,
			do_sample=False,
			temperature=0,
			pad_token_id=pad_token_id,
		)

		raw = _decode_generation(tokenizer, outputs, input_ids.shape[-1])
		if not raw:
			outputs = model.generate(
				**generate_source,
				max_new_tokens=16,
				do_sample=True,
				temperature=0.2,
				top_p=0.9,
				pad_token_id=pad_token_id,
			)
			raw = _decode_generation(tokenizer, outputs, input_ids.shape[-1])

		return _normalize_prediction(raw)
	except Exception as error:
		details = str(error).strip() or repr(error)
		trace = traceback.format_exc(limit=3)
		compact_trace = " | ".join(line.strip() for line in trace.splitlines() if line.strip())
		return f"error: {type(error).__name__}: {details}; trace={compact_trace}"


def classify_with_bielik(email_text: str) -> str:
	return classify_with_bielik_alias(email_text, "bielik-4bit")


def classify_with_bielik2(email_text: str) -> str:
	return classify_with_bielik_alias(email_text, "bielik2-4bit")
