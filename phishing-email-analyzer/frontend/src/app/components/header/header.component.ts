import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../services/theme.service';
import { LocaleService } from '../../services/locale.service';
import { headerTranslations } from '../../utils/translations/translations';
import { LocaleCode } from '../../utils/types/types';

@Component({
  selector: 'page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
  private readonly localeService = inject(LocaleService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly switchToLight = headerTranslations['switchToLight'];
  readonly switchToDark = headerTranslations['switchToDark'];
  readonly switchToEnglish = headerTranslations['switchToEnglish'];
  readonly switchToPolish = headerTranslations['switchToPolish'];

  isPolishLocale(): boolean {
    const lang = this.document.documentElement.lang || '';
    if (lang.startsWith('pl')) return true;

    const path = this.document.defaultView?.location.pathname || '';
    return path === '/pl' || path.startsWith('/pl/');
  }

  async toggleLanguage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const location = this.document.defaultView?.location;
    if (!location) {
      return;
    }

    const { pathname, search, hash } = location;
    const localePrefixMatch = /^\/(en|pl)(?=\/|$)/.exec(pathname);
    const hadLocalePrefix = Boolean(localePrefixMatch);
    const currentPath = localePrefixMatch
      ? pathname.replace(/^\/(en|pl)(?=\/|$)/, '') || '/'
      : pathname || '/';
    const nextLocale: LocaleCode = this.isPolishLocale() ? 'en' : 'pl';

    // Persist locale preference on the server, but do not block navigation on failure.
    try {
      await this.localeService.setPreferredLocale(nextLocale);
    } catch {
      // Intentionally ignored: language switch should still work by URL path.
    }

    let nextPath: string;
    if (nextLocale === 'pl') {
      nextPath = currentPath === '/' ? '/pl' : `/pl${currentPath}`;
    } else if (hadLocalePrefix) {
      nextPath = currentPath === '/' ? '/en' : `/en${currentPath}`;
    } else {
      nextPath = currentPath;
    }

    location.assign(`${nextPath}${search}${hash}`);
  }

  toggleTheme() {
    this.theme.toggleDarkMode(!this.theme.isDark());
  }
}
