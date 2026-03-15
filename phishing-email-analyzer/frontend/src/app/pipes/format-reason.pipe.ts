import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'formatReason',
  standalone: true,
})
export class FormatReasonPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return $localize`:pipes|Fallback reason when model explanation is empty@@pipes.noReason:No additional justification.`;
    }

    let formatted = value
      // Convert **bold** to <strong>
      .replaceAll(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Convert numbered lists (1. 2. etc) to proper formatting
      .replaceAll(/^(\d+\.\s+\*\*[^*]+\*\*:?)/gm, '<div class="mt-3 mb-1">$1</div>')
      // Add line breaks for better readability
      .replaceAll('\n', '<br>')
      // Style numbered items
      .replaceAll(/^(\d+\.)/gm, '<span class="font-bold text-primary">$1</span>');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
