import os

from google import genai


SYSTEM_PROMPT = """You are a phishing detection expert. Analyze the email and provide:
1. Classification: 'phishing' or 'legit'
2. Detailed explanation of why you classified it this way, mentioning specific red flags or legitimate indicators.

Format your response as:
Classification: [phishing/legit]
Reason: [Your detailed explanation]"""

_gemini_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client

    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    return _gemini_client


def classify_with_gemini(email_text: str, model: str) -> tuple[str, str]:
    """Classify email using Google Gemini models.
    
    Returns:
        tuple[str, str]: (prediction, reason)
    """
    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model=model,
            contents=f"{SYSTEM_PROMPT}\n\nEmail:\n{email_text}"
        )
        
        content = response.text.strip()
        
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
