import { DebugElement, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
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

  it('should invoke toggle handlers when header buttons are clicked', () => {
    const languageSpy = vi.spyOn(fixture.componentInstance, 'toggleLanguage');
    const themeSpy = vi.spyOn(fixture.componentInstance, 'toggleTheme');

    (util.languageToggleButton().nativeElement as HTMLButtonElement).click();
    (util.themeToggleButton().nativeElement as HTMLButtonElement).click();

    expect(languageSpy).toHaveBeenCalledTimes(1);
    expect(themeSpy).toHaveBeenCalledTimes(1);
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

  it('should redirect to /pl prefix when current locale is not polish', async () => {
    const { component, assign, localeServiceMock } = await createFixture({
      pathname: '/en/offers',
      search: '?page=2',
      hash: '#top',
      lang: 'en',
    });

    await component.toggleLanguage();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('pl');
    expect(assign).toHaveBeenCalledWith('/pl/offers?page=2#top');
  });

  it('should remove /pl prefix when current locale is polish', async () => {
    const { component, assign, localeServiceMock } = await createFixture({
      pathname: '/pl/offers',
      search: '?page=1',
      hash: '#section',
    });

    await component.toggleLanguage();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('en');
    expect(assign).toHaveBeenCalledWith('/en/offers?page=1#section');
  });

  it('should not redirect on server platform', async () => {
    const { component, assign, localeServiceMock } = await createFixture({
      platformId: 'server',
      pathname: '/offers',
    });

    await component.toggleLanguage();

    expect(localeServiceMock.setPreferredLocale).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('should not redirect when location is unavailable', async () => {
    const { component, documentMock, localeServiceMock } = await createFixture();
    (documentMock as any).defaultView = {};

    await component.toggleLanguage();

    expect(localeServiceMock.setPreferredLocale).not.toHaveBeenCalled();
    expect(true).toBe(true);
  });

  it('should still redirect when locale persistence fails', async () => {
    const { component, assign } = await createFixture({
      pathname: '/en/offers',
      setPreferredLocale: vi.fn().mockRejectedValue(new Error('network error')),
    });

    await component.toggleLanguage();

    expect(assign).toHaveBeenCalledWith('/pl/offers');
  });

  it('should keep legacy non-prefixed english path when switching from pl is not involved', async () => {
    const { component, assign, localeServiceMock } = await createFixture({
      pathname: '/offers',
      lang: 'en',
    });

    await component.toggleLanguage();

    expect(localeServiceMock.setPreferredLocale).toHaveBeenCalledWith('pl');
    expect(assign).toHaveBeenCalledWith('/pl/offers');
  });

  it('should toggle theme by negating current state', async () => {
    const { component, themeMock } = await createFixture();

    component.toggleTheme();
    expect(themeMock.toggleDarkMode).toHaveBeenCalledWith(true);

    themeMock.isDark.set(true);
    component.toggleTheme();
    expect(themeMock.toggleDarkMode).toHaveBeenCalledWith(false);
  });
});
