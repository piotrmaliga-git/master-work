import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LocaleCode } from 'utils/types/types';

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private readonly http = inject(HttpClient);

  setPreferredLocale(locale: LocaleCode): Promise<void> {
    return firstValueFrom(this.http.post<void>('/api/locale', { locale }));
  }
}
