import { Component, signal, ChangeDetectionStrategy, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { AI_MODEL_OPTIONS, AiModelId } from '../../utils/constants/constans';
import { analyzerTranslations } from '../../utils/translations/translations';

@Component({
  selector: 'analyzer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    MessageModule,
    CardModule,
  ],
  templateUrl: './analyzer.component.html',
})
export class AnalyzerComponent {
  readonly loading = input.required<boolean>();
  readonly externalError = input<string>('');
  readonly analyzeRequest = output<{
    emailText: string;
    selectedModel: AiModelId;
    sender: string;
    title: string;
  }>();

  emailText = signal<string>('');
  sender = signal<string>('');
  title = signal<string>('');
  selectedModel = signal<AiModelId>(AiModelId.GPT_4_1);
  internalError = signal<string>('');

  protected readonly models = AI_MODEL_OPTIONS;

  protected readonly errorEmptyEmail = analyzerTranslations['errorEmptyEmail'];

  protected onAnalyze() {
    if (!this.emailText().trim()) {
      this.internalError.set(this.errorEmptyEmail);
      return;
    }
    this.analyzeRequest.emit({
      emailText: this.emailText(),
      selectedModel: this.selectedModel(),
      sender: this.sender().trim(),
      title: this.title().trim(),
    });
  }

  protected clear() {
    this.emailText.set('');
    this.sender.set('');
    this.title.set('');
    this.internalError.set('');
  }
}
