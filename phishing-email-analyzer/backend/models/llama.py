import os
import re
import tempfile


async def classify_with_llama(email_text: str) -> str:
	"""Classify email using Llama Cloud API (via parsing endpoint)."""
	try:
		from llama_cloud import AsyncLlamaCloud
	except Exception:
		return "error: Missing dependency 'llama_cloud'. Install it with: pip install llama-cloud"

	api_key = os.getenv("LLAMA_API_KEY")
	if not api_key:
		return "error: Missing LLAMA_API_KEY in environment (.env)"

	parse_tier = os.getenv("LLAMA_PARSE_TIER", "fast")

	temp_path = None
	try:
		with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as temp_file:
			temp_file.write(email_text)
			temp_path = temp_file.name

		client = AsyncLlamaCloud(api_key=api_key)
		file_obj = await client.files.create(file=temp_path, purpose="parse")

		result = await client.parsing.parse(
			file_id=file_obj.id,
			tier=parse_tier,
			version="latest",
			expand=["text_full"],
		)

		parsed_text = (getattr(result, "text_full", "") or email_text).strip().lower()

		if parsed_text in {"phishing", "legit", "legitimate"}:
			return "legit" if parsed_text.startswith("legit") else "phishing"

		score = 0
		if any(re.search(pattern, parsed_text) for pattern in [r"pilnie", r"natychmiast", r"urgent", r"immediately", r"asap"]):
			score += 1
		if any(re.search(pattern, parsed_text) for pattern in [r"has[łl]o", r"password", r"login", r"konto", r"account", r"verify", r"potwierd[źz]"]):
			score += 1
		if any(re.search(pattern, parsed_text) for pattern in [r"kliknij", r"click", r"link", r"za[łl][ąa]cznik", r"attachment", r"log in", r"zaloguj"]):
			score += 1

		return "phishing" if score >= 2 else "legit"
	except Exception as e:
		return f"error: {str(e)}"
	finally:
		if temp_path and os.path.exists(temp_path):
			try:
				os.remove(temp_path)
			except OSError:
				pass
