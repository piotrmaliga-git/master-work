import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'formatReason',
  standalone: true,
})
export class FormatReasonPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return 'Brak dodatkowego uzasadnienia.';
    }

    let formatted = value
      // Convert **bold** to <strong>
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Convert numbered lists (1. 2. etc) to proper formatting
      .replace(/^(\d+\.\s+\*\*[^*]+\*\*:?)/gm, '<div class="mt-3 mb-1">$1</div>')
      // Add line breaks for better readability
      .replace(/\n/g, '<br>')
      // Style numbered items
      .replace(/^(\d+\.)/gm, '<span class="font-bold text-primary">$1</span>');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
