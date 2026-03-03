import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsComponent } from '../../components/results/results.component';
import { AnalysisResult } from '../../models/prediction';

describe('ResultsComponent', () => {
  let fixture: ComponentFixture<ResultsComponent>;

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

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')).toBeNull();
  });

  it('should render analysis details when result is provided', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'phishing',
      reason: 'Suspicious URL domain',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'attacker@example.com',
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

  it('should render fallback reason when reason is empty', () => {
    const result: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'legit',
      reason: '',
      timestamp: '2026-03-03T11:00:00Z',
      sender: 'sender@example.com',
    };

    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Brak dodatkowego uzasadnienia.');
  });
});
