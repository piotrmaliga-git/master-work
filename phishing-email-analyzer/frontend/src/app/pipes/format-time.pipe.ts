import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTime',
})
export class FormatTimePipe implements PipeTransform {
  transform(milliseconds: number | undefined): string {
    if (milliseconds === undefined || milliseconds === null) {
      return 'N/A';
    }

    if (milliseconds >= 1000) {
      const seconds = Math.floor(milliseconds / 1000);
      const ms = Math.round(milliseconds % 1000);
      return `${seconds}s ${ms}ms`;
    }

    return `${Math.round(milliseconds)}ms`;
  }
}
