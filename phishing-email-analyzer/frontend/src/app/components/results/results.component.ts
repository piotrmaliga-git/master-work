import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type AnalysisResult } from '../../utils/interfaces/interfaces';
import { FormatReasonPipe } from '../../pipes/format-reason.pipe';
import { FormatTimePipe } from '../../pipes/format-time.pipe';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormatTimePipe, CardModule, TagModule, FormatReasonPipe],
  templateUrl: './results.component.html',
})
export class ResultsComponent {
  result = input<AnalysisResult | null>(null);
}
