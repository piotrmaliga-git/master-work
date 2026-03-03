export interface EmailRequest {
  email_text: string;
  model_name: string;
  sender?: string;
}

export interface AnalysisResult {
  model: string;
  prediction: 'phishing' | 'legit';
  reason: string;
  timestamp: string;
  sender: string;
}
