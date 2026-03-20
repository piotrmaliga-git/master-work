import { type DebugElement } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ResultsComponent } from '../../components/results/results.component';
import { type AnalysisResult } from '../../utils/interfaces/interfaces';

describe('ResultsComponent', () => {
  let fixture: ComponentFixture<ResultsComponent>;

  const util = {
    resultsCard(): DebugElement | null {
      return fixture.debugElement.query(By.css('[data-testid="results-card"]'));
    },
    predictionTag(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="prediction-tag"]'));
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsComponent);
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should not render analysis block when result is null', () => {
    fixture.componentRef.setInput('result', null);
    fixture.detectChanges();

    expect(util.resultsCard()).toBeNull();
  });

  it('should render analysis details when result is provided', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'phishing',
      reason: 'Suspicious URL domain',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'attacker@example.com',
      title: 'Urgent Account Verification',
      response_time_ms: 1234,
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Analysis Result');
    expect(compiled.textContent).toContain('gpt-4.1');
    expect(compiled.textContent).toContain('attacker@example.com');
    expect(compiled.textContent).toContain('PHISHING');
    expect(compiled.textContent).toContain('Suspicious URL domain');
  });

  it('should render formatted response time', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'phishing',
      reason: 'Suspicious URL domain',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'attacker@example.com',
      title: 'Urgent Account Verification',
      response_time_ms: 1234,
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Response Time');
    expect(compiled.textContent).toContain('1s 234ms');
  });

  it('should apply phishing style class for phishing prediction', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'phishing',
      reason: 'Suspicious URL domain',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'attacker@example.com',
      title: 'Urgent Account Verification',
      response_time_ms: 1234,
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    expect(util.predictionTag().componentInstance.severity).toBe('danger');
  });

  it('should apply legit style class for legit prediction', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'legit',
      reason: 'Looks fine',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'sender@example.com',
      title: 'Newsletter',
      response_time_ms: 500,
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    expect(util.predictionTag().componentInstance.severity).toBe('success');
  });

  it('should render fallback reason when reason is empty', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'legit',
      reason: '',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'sender@example.com',
      title: 'Newsletter',
      response_time_ms: 567,
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No additional justification.');
  });
});
