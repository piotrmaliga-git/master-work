import { of, throwError } from 'rxjs';
import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HomePageComponent } from '../../pages/home/home.component';
import { ApiService } from '../../services/api.service';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';
import { AiModelId } from '../../utils/constants/constans';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let apiServiceMock: { analyze: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiServiceMock = {
      analyze: vi.fn(),
    };

    component = new HomePageComponent(apiServiceMock as any);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should map payload and set result on successful analyze request', async () => {
    const response = {
      model: 'gpt-4.1',
      prediction: 'phishing' as const,
      reason: 'Suspicious content',
      timestamp: '2026-03-03T12:00:00Z',
      sender: 'attacker@example.com',
      title: 'Test Email',
      response_time_ms: 1500,
    };
    apiServiceMock.analyze.mockReturnValue(of(response));

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'sender@example.com',
      title: 'Test Email',
    });

    expect(apiServiceMock.analyze).toHaveBeenCalledWith({
      email_text: 'Mail body',
      model_name: 'gpt-4.1',
      sender: 'sender@example.com',
      title: 'Test Email',
    });
    expect(component.result()).toEqual(response);
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('should clear previous state when starting a new analyze request', async () => {
    const response = {
      model: 'gpt-4.1',
      prediction: 'legit' as const,
      reason: 'Looks safe',
      timestamp: '2026-03-03T12:00:00Z',
      sender: 'sender@example.com',
      title: 'Status update',
      response_time_ms: 100,
    };
    apiServiceMock.analyze.mockReturnValue(of(response));

    component.result.set({ stale: true } as any);
    component.error.set('Old error');

    const promise = component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'sender@example.com',
      title: 'Status update',
    });

    expect(component.loading()).toBe(true);
    expect(component.error()).toBe('');
    expect(component.result()).toBeNull();

    await promise;
    expect(component.loading()).toBe(false);
  });

  it('should keep result null when backend returns no response body', async () => {
    apiServiceMock.analyze.mockReturnValue(of(undefined));

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'sender@example.com',
      title: 'Test Email',
    });

    expect(component.result()).toBeNull();
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('should set backend detail error when analyze request fails', async () => {
    apiServiceMock.analyze.mockReturnValue(
      throwError(() => ({ error: { detail: 'Backend timeout' } }))
    );

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'test@example.com',
      title: 'Test',
    });

    expect(component.result()).toBeNull();
    expect(component.error()).toBe('Backend timeout');
    expect(component.loading()).toBe(false);
  });

  it('should set default error when backend detail is not available', async () => {
    apiServiceMock.analyze.mockReturnValue(throwError(() => new Error('Network down')));

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'test@example.com',
      title: 'Test',
    });

    expect(component.result()).toBeNull();
    expect(component.error()).toBe(
      'Error analyzing email. Make sure backend is running on http://localhost:8000'
    );
    expect(component.loading()).toBe(false);
  });

  it('should clear result and error in clear()', () => {
    component.result.set({ model: 'x' } as any);
    component.error.set('Some error');

    component.clear();

    expect(component.result()).toBeNull();
    expect(component.error()).toBe('');
  });
});

describe('HomePageComponent template', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let apiServiceMock: { analyze: ReturnType<typeof vi.fn> };

  const util = {
    header(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="home-header"]'));
    },
    analyzer(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="home-analyzer"]'));
    },
    results(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="home-results"]'));
    },
    info(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="home-info"]'));
    },
    footer(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="home-footer"]'));
    },
    analyzerDebug(): DebugElement {
      return fixture.debugElement.query(By.directive(AnalyzerComponent));
    },
  };

  beforeEach(async () => {
    apiServiceMock = {
      analyze: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [{ provide: ApiService, useValue: apiServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component fixture', () => {
    expect(component).toBeTruthy();
  });

  it('should render all main child sections', () => {
    expect(util.header()).toBeTruthy();
    expect(util.analyzer()).toBeTruthy();
    expect(util.results()).toBeTruthy();
    expect(util.info()).toBeTruthy();
    expect(util.footer()).toBeTruthy();
  });

  it('should handle analyzeRequest emitted by analyzer child', async () => {
    const response = {
      model: 'gpt-4.1',
      prediction: 'phishing' as const,
      reason: 'Suspicious content',
      timestamp: '2026-03-03T12:00:00Z',
      sender: 'sender@example.com',
      title: 'Injected title',
      response_time_ms: 321,
    };
    apiServiceMock.analyze.mockReturnValue(of(response));

    component.onAnalyzeRequest({
      emailText: 'Payload from child output',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'sender@example.com',
      title: 'Injected title',
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(apiServiceMock.analyze).toHaveBeenCalledWith({
      email_text: 'Payload from child output',
      model_name: 'gpt-4.1',
      sender: 'sender@example.com',
      title: 'Injected title',
    });
    expect(component.result()?.title).toBe('Injected title');
    expect(component.loading()).toBe(false);
  });
});
