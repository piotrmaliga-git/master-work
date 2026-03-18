import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

import { HeaderComponent } from '../../components/header/header.component';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';
import { ResultsComponent } from '../../components/results/results.component';
import { InfoComponent } from '../../components/info/info.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AiModelId } from '../../utils/constants/constans';

const comments = [
  HeaderComponent,
  AnalyzerComponent,
  ResultsComponent,
  InfoComponent,
  FooterComponent,
];

@Component({
  selector: 'home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...comments],
  template: `<div class="app-shell">
    <page-header data-testid="home-header" />
    <main class="app-content">
      <analyzer
        data-testid="home-analyzer"
        [loading]="loading()"
        [externalError]="error()"
        (analyzeRequest)="onAnalyzeRequest($event)"
      ></analyzer>
      <results data-testid="home-results" [result]="result()"></results>
      <info data-testid="home-info" />
    </main>
    <page-footer data-testid="home-footer" />
  </div>`,
})
export class HomePageComponent {
  result = signal<any>(null);
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor(private readonly api: ApiService) {}

  async onAnalyzeRequest(payload: {
    emailText: string;
    selectedModel: AiModelId;
    sender: string;
    title: string;
  }) {
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);

    try {
      const response = await firstValueFrom(
        this.api.analyze({
          email_text: payload.emailText,
          model_name: payload.selectedModel,
          sender: payload.sender,
          title: payload.title,
        })
      );

      this.result.set(response ?? null);
    } catch (error: any) {
      this.error.set(
        error?.error?.detail ||
          'Error analyzing email. Make sure backend is running on http://localhost:8000'
      );
    } finally {
      this.loading.set(false);
    }
  }

  clear() {
    this.result.set(null);
    this.error.set('');
  }
}
