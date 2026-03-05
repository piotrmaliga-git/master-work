import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from '../../services/api.service';

import { HeaderComponent } from '../../components/header/header.component';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';
import { ResultsComponent } from '../../components/results/results.component';
import { InfoComponent } from '../../components/info/info.component';
import { FooterComponent } from '../../components/footer/footer.component';

const comments = [
  HeaderComponent,
  AnalyzerComponent,
  ResultsComponent,
  InfoComponent,
  FooterComponent,
];

@Component({
  selector: 'home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...comments],
  template: `<div
    class="min-h-screen w-full bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col"
  >
    <page-header />
    <main class="w-full max-w-6xl mx-auto px-5 flex flex-col flex-1">
      <analyzer
        [loading]="loading()"
        [error]="error()"
        (analyzeRequest)="onAnalyzeRequest($event)"
      ></analyzer>
      <results [result]="result()"></results>
      <info />
    </main>
    <page-footer />
  </div>`,
})
export class HomePageComponent {
  result = signal<any>(null);
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor(private api: ApiService) {}

  async onAnalyzeRequest(payload: {
    emailText: string;
    selectedModel: string;
    sender: string;
    title: string;
  }) {
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);

    // Start timing
    const startTime = performance.now();

    try {
      const response = await this.api
        .analyze({
          email_text: payload.emailText,
          model_name: payload.selectedModel,
          sender: payload.sender,
          title: payload.title,
        })
        .toPromise();

      // Calculate frontend response time
      const endTime = performance.now();
      const frontendTimeMs = Math.round((endTime - startTime) * 100) / 100;

      // Add frontend time to response
      if (response) {
        response.frontend_time_ms = frontendTimeMs;
      }

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
