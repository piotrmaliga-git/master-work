import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';

describe('AnalyzerComponent', () => {
  let fixture: ComponentFixture<AnalyzerComponent>;
  let component: AnalyzerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyzerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should expose expected models list', () => {
    expect(component.models.length).toBe(8);
    expect(component.models.map((model) => model.id)).toContain('gpt-4.1');
    expect(component.models.map((model) => model.id)).toContain('bielik2-4bit');
  });

  it('should set internal error and not emit when email text is empty', () => {
    const emitSpy = vi.spyOn(component.analyzeRequest, 'emit');

    component.emailText.set('   ');
    component.onAnalyze();

    expect(component.internalError()).toBe('Please enter email text');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit analyze request for valid input and trim sender', () => {
    const emitSpy = vi.spyOn(component.analyzeRequest, 'emit');

    component.emailText.set('Important email content');
    component.selectedModel.set('gpt-4.1');
    component.sender.set('  sender@example.com  ');

    component.onAnalyze();

    expect(emitSpy).toHaveBeenCalledWith({
      emailText: 'Important email content',
      selectedModel: 'gpt-4.1',
      sender: 'sender@example.com',
    });
  });

  it('should clear all editable fields and internal error', () => {
    component.emailText.set('Body');
    component.sender.set('sender@example.com');
    component.internalError.set('Some error');

    component.clear();

    expect(component.emailText()).toBe('');
    expect(component.sender()).toBe('');
    expect(component.internalError()).toBe('');
  });

  it('should render external error message when error input is provided', () => {
    fixture.componentRef.setInput('error', 'Backend unavailable');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Backend unavailable');
  });
});
