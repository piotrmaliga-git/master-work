import os

from openai import OpenAI


SYSTEM_PROMPT = "You are a phishing classifier. Analyze the email text and respond with ONLY 'phishing' or 'legit', nothing else."
GPT4_1_MODEL = "gpt-4.1"

_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    global _openai_client

    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    return _openai_client


def classify_with_gpt4_1(email_text: str) -> str:
    """Classify email using GPT-4.1 model."""
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model=GPT4_1_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": email_text}
            ],
            temperature=0
        )
        return response.choices[0].message.content.strip().lower()
    except Exception as e:
        return f"error: {str(e)}"
