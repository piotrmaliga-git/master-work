import os

from openai import OpenAI


SYSTEM_PROMPT = """You are a phishing detection expert. Analyze the email and provide:
1. Classification: 'phishing' or 'legit'
2. Detailed explanation of why you classified it this way, mentioning specific red flags or legitimate indicators.

Format your response as:
Classification: [phishing/legit]
Reason: [Your detailed explanation]"""

GPT4_1_MODEL = "gpt-4.1"

_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    global _openai_client

    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    return _openai_client


def classify_with_gpt4_1(email_text: str) -> tuple[str, str]:
    """Classify email using GPT-4.1 model.
    
    Returns:
        tuple[str, str]: (prediction, reason)
    """
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model=GPT4_1_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": email_text}
            ],
            temperature=0,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse the response
        prediction = "legit"
        reason = content
        
        # Extract classification and reason
        if "Classification:" in content and "Reason:" in content:
            parts = content.split("Reason:", 1)
            classification_part = parts[0].replace("Classification:", "").strip().lower()
            reason = parts[1].strip() if len(parts) > 1 else content
            
            if "phishing" in classification_part:
                prediction = "phishing"
            elif "legit" in classification_part:
                prediction = "legit"
        else:
            # Fallback: check if phishing is mentioned
            if "phishing" in content.lower():
                prediction = "phishing"
        
        return prediction, reason
        
    except Exception as e:
        return f"error: {str(e)}", str(e)
