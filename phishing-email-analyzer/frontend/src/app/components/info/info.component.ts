import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { infoTranslations } from '../../utils/translations/translations';

@Component({
  selector: 'info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule],
  templateUrl: './info.component.html',
})
export class InfoComponent {
  readonly models = computed(() => [
    {
      name: 'GPT-4.1',
      description: infoTranslations['gpt41Description'],
    },
    {
      name: 'Gemini 2.5 Pro',
      description: infoTranslations['gemini25ProDescription'],
    },
    {
      name: 'Mistral 7B',
      description: infoTranslations['mistral7BDescription'],
    },
    {
      name: 'Llama Cloud',
      description: infoTranslations['llamaCloudDescription'],
    },
    {
      name: 'Bielik 2 (4-bit)',
      description: infoTranslations['bielik24bitDescription'],
    },
  ]);
}
