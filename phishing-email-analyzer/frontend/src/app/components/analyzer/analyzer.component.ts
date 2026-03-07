import { Component, signal, ChangeDetectionStrategy, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'analyzer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './analyzer.component.html',
})
export class AnalyzerComponent {
  readonly loading = input.required<boolean>();
  readonly externalError = input<string>('', { alias: 'error' });
  readonly analyzeRequest = output<{
    emailText: string;
    selectedModel: string;
    sender: string;
    title: string;
  }>();

  emailText = signal<string>('');
  sender = signal<string>('');
  title = signal<string>('');
  selectedModel = signal<string>('gpt-4.1');
  internalError = signal<string>('');

  models = [
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'mistral-7b', name: 'Mistral 7B' },
    { id: 'llama-cloud', name: 'Llama Cloud' },
    { id: 'bielik-2-4bit', name: 'Bielik 2 (4-bit)' },
  ];
  onAnalyze() {
    if (!this.emailText().trim()) {
      this.internalError.set('Please enter email text');
      return;
    }
    this.analyzeRequest.emit({
      emailText: this.emailText(),
      selectedModel: this.selectedModel(),
      sender: this.sender().trim(),
      title: this.title().trim(),
    });
  }

  clear() {
    this.emailText.set('');
    this.sender.set('');
    this.title.set('');
    this.internalError.set('');
  }
}
