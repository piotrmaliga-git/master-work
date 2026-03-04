import os

from google import genai


SYSTEM_PROMPT = "You are a phishing classifier. Analyze the email text and respond with ONLY 'phishing' or 'legit', nothing else."

_gemini_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client

    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    return _gemini_client


def classify_with_gemini(email_text: str, model: str) -> str:
    """Classify email using Google Gemini models."""
    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model=model,
            contents=f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}"
        )
        return response.text.strip().lower()
    except Exception as e:
        return f"error: {str(e)}"
