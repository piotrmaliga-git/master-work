import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';
import { AiModelId } from '../../models/ai-model';

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
    expect(component.models.length).toBe(5);
    expect(component.models.map((model) => model.id)).toContain(AiModelId.GPT_4_1);
    expect(component.models.map((model) => model.id)).toContain(AiModelId.BIELIK_2_4BIT);
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
    component.selectedModel.set(AiModelId.GPT_4_1);
    component.sender.set('  sender@example.com  ');

    component.onAnalyze();

    expect(emitSpy).toHaveBeenCalledWith({
      emailText: 'Important email content',
      selectedModel: AiModelId.GPT_4_1,
      sender: 'sender@example.com',
      title: '',
    });
  });

  it('should trim title before emitting analyze request', () => {
    const emitSpy = vi.spyOn(component.analyzeRequest, 'emit');

    component.emailText.set('Important email content');
    component.title.set('  Urgent action required  ');

    component.onAnalyze();

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Urgent action required' })
    );
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

  it('should disable form controls and show loading label when loading is true', async () => {
    fixture.componentRef.setInput('loading', true);
    fixture.componentInstance.emailText.set('Some content');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('[data-testid="model-select"]') as HTMLElement;
    const senderInput = compiled.querySelector('[data-testid="sender-input"]') as HTMLInputElement;
    const titleInput = compiled.querySelector('[data-testid="title-input"]') as HTMLInputElement;
    const textarea = compiled.querySelector('[data-testid="email-input"]') as HTMLTextAreaElement;
    const analyzeButton = compiled.querySelector(
      '[data-testid="analyze-button"]'
    ) as HTMLButtonElement;
    const clearButton = compiled.querySelector('[data-testid="clear-button"]') as HTMLButtonElement;

    expect(select.className).toContain('p-disabled');
    expect(senderInput.disabled).toBe(true);
    expect(titleInput.disabled).toBe(true);
    expect(textarea.disabled).toBe(true);
    expect(analyzeButton.disabled).toBe(true);
    expect(clearButton.disabled).toBe(true);
  });

  it('should disable analyze button when email text has only whitespace', () => {
    component.emailText.set('   ');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const analyzeButton = compiled.querySelector(
      '[data-testid="analyze-button"]'
    ) as HTMLButtonElement;

    expect(analyzeButton.disabled).toBe(true);
  });

  it('should pass configured options to model selector', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('[data-testid="model-select"]');

    expect(select).toBeTruthy();
    expect(component.models.length).toBe(5);
    expect(component.models.map((model) => model.name)).toContain('GPT-4.1');
    expect(component.models.map((model) => model.name)).toContain('Bielik 2 (4-bit)');
  });

  it('should update text fields via DOM events', async () => {
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const senderInput = compiled.querySelector('[data-testid="sender-input"]') as HTMLInputElement;
    const titleInput = compiled.querySelector('[data-testid="title-input"]') as HTMLInputElement;
    const textarea = compiled.querySelector('[data-testid="email-input"]') as HTMLTextAreaElement;

    senderInput.value = 'author@example.com';
    senderInput.dispatchEvent(new Event('input'));

    titleInput.value = 'Monthly update';
    titleInput.dispatchEvent(new Event('input'));

    textarea.value = 'Example body';
    textarea.dispatchEvent(new Event('input'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.sender()).toBe('author@example.com');
    expect(component.title()).toBe('Monthly update');
    expect(component.emailText()).toBe('Example body');
    expect(compiled.textContent).toContain('12 characters');
  });

  it('should keep controls enabled and show Analyze label when not loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentInstance.emailText.set('Example body');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('[data-testid="model-select"]') as HTMLElement;
    const senderInput = compiled.querySelector('[data-testid="sender-input"]') as HTMLInputElement;
    const titleInput = compiled.querySelector('[data-testid="title-input"]') as HTMLInputElement;
    const textarea = compiled.querySelector('[data-testid="email-input"]') as HTMLTextAreaElement;
    const analyzeButton = compiled.querySelector(
      '[data-testid="analyze-button"]'
    ) as HTMLButtonElement;

    expect(select.className).not.toContain('p-disabled');
    expect(senderInput.disabled).toBe(false);
    expect(titleInput.disabled).toBe(false);
    expect(textarea.disabled).toBe(false);
    expect(analyzeButton.disabled).toBe(false);
    expect(analyzeButton.textContent).toContain('Analyze');
  });

  it('should not render external error block when error input is empty', () => {
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.p-message')).toBeNull();
  });
});
