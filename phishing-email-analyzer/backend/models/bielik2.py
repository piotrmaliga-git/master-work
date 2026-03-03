from models.bielik import classify_with_bielik_alias


def classify_with_bielik2(email_text: str) -> str:
	return classify_with_bielik_alias(email_text, "bielik2-4bit")
