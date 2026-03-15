import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const STORAGE_KEY = 'app-theme-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isDark = signal<boolean>(false);

  constructor() {
    const initialMode = this.resolveInitialMode();
    this.setDarkMode(initialMode, false);
  }

  toggleDarkMode(enabled: boolean) {
    this.setDarkMode(enabled, true);
  }

  private setDarkMode(enabled: boolean, persist: boolean) {
    this.isDark.set(enabled);
    this.document.documentElement.classList.toggle('app-dark', enabled);

    if (persist && this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, enabled ? 'dark' : 'light');
    }
  }

  private resolveInitialMode(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
      return true;
    }

    if (saved === 'light') {
      return false;
    }

    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  }
}
