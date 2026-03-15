import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../services/theme.service';
import { headerTranslations } from '../../utils/translations/translations';

@Component({
  selector: 'page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
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

  toggleLanguage() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const location = this.document.defaultView?.location;
    if (!location) {
      return;
    }

    const { pathname, search, hash } = location;
    const withoutLocalePrefix = pathname === '/pl' ? '/' : pathname.replace(/^\/pl(?=\/)/, '');
    const currentPath = withoutLocalePrefix || '/';

    let nextPath = currentPath;
    if (!this.isPolishLocale()) {
      nextPath = currentPath === '/' ? '/pl' : `/pl${currentPath}`;
    }

    location.assign(`${nextPath}${search}${hash}`);
  }

  toggleTheme() {
    this.theme.toggleDarkMode(!this.theme.isDark());
  }
}
