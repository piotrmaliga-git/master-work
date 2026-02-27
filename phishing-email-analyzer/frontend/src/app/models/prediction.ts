export interface EmailRequest {
  email_text: string;
  model_name: string;
  sender?: string;
}

export interface AnalysisResult {
  model: string;
  prediction: 'phishing' | 'legit';
  timestamp: string;
  sender: string;
}
