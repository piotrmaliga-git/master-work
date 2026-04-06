import { signal, type DebugElement } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from './header.component';
import { LocaleService } from '../../services/locale.service';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  const util = {
    themeToggle(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="theme-toggle"]'));
    },
    themeToggleButton(): DebugElement {
      return util.themeToggle();
    },
    languageToggle(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="language-toggle"]'));
    },
    languageToggleButton(): DebugElement {
      return util.languageToggle();
    },
    moonIcon(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="theme-toggle"] .pi-moon'));
    },
    sunIcon(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="theme-toggle"] .pi-sun'));
    },
  };

  beforeEach(async () => {
    const localeServiceMock = {
      setPreferredLocale: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: LocaleService, useValue: localeServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render app title and subtitle', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Phishing Email Analyzer');
    expect(compiled.textContent).toContain(
      'Paste an email below and select an AI model to analyze phishing risk'
    );
  });

  it('should render theme switch control', () => {
    const button = util.themeToggleButton().nativeElement as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.className).toContain('p-button');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(util.moonIcon()).toBeTruthy();
  });

  it('should render language switch control', () => {
    const button = util.languageToggleButton().nativeElement as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.className).toContain('p-button');
    expect(button.textContent?.trim()).toBe('PL');
    expect(button.getAttribute('aria-label')).toBe('Switch to Polish');
  });

  it('should render light-mode toggle state when theme is dark', () => {
    fixture.componentInstance.theme.isDark.set(true);
    fixture.detectChanges();

    const button = util.themeToggleButton().nativeElement as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(util.sunIcon()).toBeTruthy();
  });

  it('should update icon state when theme button is clicked', () => {
    (util.themeToggleButton().nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    const button = util.themeToggleButton().nativeElement as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(util.sunIcon()).toBeTruthy();
  });
});

describe('HeaderComponent behavior', () => {
  const createFixture = async (options?: {
    platformId?: string;
    pathname?: string;
    search?: string;
    hash?: string;
    lang?: string;
    setPreferredLocale?: ReturnType<typeof vi.fn>;
  }) => {
    const assign = vi.fn();
    const location = {
      pathname: options?.pathname ?? '/',
      search: options?.search ?? '',
      hash: options?.hash ?? '',
      assign,
    };

    const documentMock = {
      documentElement: {
        lang: options?.lang ?? '',
      },
      defaultView: {
        location,
      },
    };

    const themeMock = {
      isDark: signal(false),
      toggleDarkMode: vi.fn(),
    };

    const localeServiceMock = {
      setPreferredLocale: options?.setPreferredLocale ?? vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: LocaleService, useValue: localeServiceMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(HeaderComponent);
    const component = fixture.componentInstance as any;

    component.document = documentMock;
    component.platformId = options?.platformId ?? 'browser';
    component.theme = themeMock;
    component.localeService = localeServiceMock;

    fixture.detectChanges();

    return {
      fixture,
      component: component as HeaderComponent,
      assign,
      themeMock,
      documentMock,
      localeServiceMock,
    };
  };

  it('should detect polish locale from html lang attribute', async () => {
    const { component } = await createFixture({ lang: 'pl-PL' });

    expect(component.isPolishLocale()).toBe(true);
  });

  it('should detect polish locale from /pl path prefix', async () => {
    const { component } = await createFixture({ pathname: '/pl/inbox' });

    expect(component.isPolishLocale()).toBe(true);
  });

  it('should expose english switch labels when current locale is polish', async () => {
    const { fixture } = await createFixture({ lang: 'pl-PL' });
    const button = fixture.nativeElement.querySelector(
      '[data-testid="language-toggle"]'
    ) as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('EN');
    expect(button.getAttribute('aria-label')).toBe('Switch to English');
    expect(button.getAttribute('title')).toBe('Switch to English');
  });

  it('should redirect to /pl prefix when current locale is not polish', async () => {
    const { fixture, assign, localeServiceMock } = await createFixture({
      pathname: '/en/offers',
      search: '?page=2',
      hash: '#top',
      lang: 'en',
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('pl');
    expect(assign).toHaveBeenCalledWith('/pl/offers?page=2#top');
  });

  it('should remove /pl prefix when current locale is polish', async () => {
    const { fixture, assign, localeServiceMock } = await createFixture({
      pathname: '/pl/offers',
      search: '?page=1',
      hash: '#section',
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('en');
    expect(assign).toHaveBeenCalledWith('/offers?page=1#section');
  });

  it('should redirect /pl root path to / when switching from polish', async () => {
    const { fixture, assign, localeServiceMock } = await createFixture({
      pathname: '/pl',
      search: '?tab=home',
      hash: '#hero',
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('en');
    expect(assign).toHaveBeenCalledWith('/?tab=home#hero');
  });

  it('should not redirect on server platform', async () => {
    const { fixture, assign, localeServiceMock } = await createFixture({
      platformId: 'server',
      pathname: '/offers',
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('should not redirect when location is unavailable', async () => {
    const { fixture, documentMock, localeServiceMock } = await createFixture();
    (documentMock as any).defaultView = {};

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).not.toHaveBeenCalled();
    expect(true).toBe(true);
  });

  it('should still redirect when locale persistence fails', async () => {
    const { fixture, assign } = await createFixture({
      pathname: '/en/offers',
      setPreferredLocale: vi.fn().mockRejectedValue(new Error('network error')),
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(assign).toHaveBeenCalledWith('/pl/offers');
  });

  it('should keep legacy non-prefixed english path when switching from pl is not involved', async () => {
    const { fixture, assign, localeServiceMock } = await createFixture({
      pathname: '/offers',
      lang: 'en',
    });

    (
      fixture.nativeElement.querySelector('[data-testid="language-toggle"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('pl');
    expect(assign).toHaveBeenCalledWith('/pl/offers');
  });

  it('should toggle theme by negating current state', async () => {
    const { fixture, themeMock } = await createFixture();

    (
      fixture.nativeElement.querySelector('[data-testid="theme-toggle"]') as HTMLButtonElement
    ).click();
    expect(themeMock.toggleDarkMode).toHaveBeenCalledWith(true);

    themeMock.isDark.set(true);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('[data-testid="theme-toggle"]') as HTMLButtonElement
    ).click();
    expect(themeMock.toggleDarkMode).toHaveBeenCalledWith(false);
  });
});
