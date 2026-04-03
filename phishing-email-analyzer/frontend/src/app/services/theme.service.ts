import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Theme } from '../utils/enums/enums';
import { STORAGE_KEY } from '../utils/constants/constants';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isDark = signal<boolean>(this.resolveInitialMode());

  constructor() {
    this.document.documentElement.classList.toggle('app-dark', this.isDark());
  }

  toggleDarkMode(enabled: boolean) {
    this.setDarkMode(enabled, true);
  }

  private setDarkMode(enabled: boolean, persist: boolean) {
    this.isDark.set(enabled);
    this.document.documentElement.classList.toggle('app-dark', enabled);

    if (persist && this.isBrowser) {
      const themeToSave: Theme = enabled ? Theme.dark : Theme.light;
      localStorage.setItem(STORAGE_KEY, themeToSave);
    }
  }

  private resolveInitialMode(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === Theme.dark) {
      return true;
    }

    if (saved === Theme.light) {
      return false;
    }

    if (typeof globalThis.matchMedia === 'function') {
      return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  }
}
