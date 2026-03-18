import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { AnalyzerComponent } from '../../components/analyzer/analyzer.component';
import { AiModelId } from '../../utils/constants/constans';

describe('AnalyzerComponent', () => {
  let fixture: ComponentFixture<AnalyzerComponent>;
  let component: AnalyzerComponent;

  const util = {
    select(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="model-select"]'));
    },
    selectElement(): DebugElement {
      return util.select();
    },
    senderInput(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="sender-input"]'));
    },
    senderInputElement(): DebugElement {
      return util.senderInput();
    },
    titleInput(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="title-input"]'));
    },
    titleInputElement(): DebugElement {
      return util.titleInput();
    },
    textarea(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="email-input"]'));
    },
    textareaElement(): DebugElement {
      return util.textarea();
    },
    analyzeButton(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="analyze-button"]'));
    },
    analyzeButtonElement(): DebugElement {
      return util.analyzeButton();
    },
    clearButton(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="clear-button"]'));
    },
    clearButtonElement(): DebugElement {
      return util.clearButton();
    },
    errorMessage(): DebugElement | null {
      return fixture.debugElement.query(By.css('[data-testid="external-error"]'));
    },
  };

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
    fixture.componentRef.setInput('externalError', 'Backend unavailable');
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

    expect((util.selectElement().nativeElement as HTMLElement).className).toContain('p-disabled');
    expect((util.senderInputElement().nativeElement as HTMLInputElement).disabled).toBe(true);
    expect((util.titleInputElement().nativeElement as HTMLInputElement).disabled).toBe(true);
    expect((util.textareaElement().nativeElement as HTMLTextAreaElement).disabled).toBe(true);
    expect((util.analyzeButtonElement().nativeElement as HTMLButtonElement).disabled).toBe(true);
    expect((util.clearButtonElement().nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable analyze button when email text has only whitespace', () => {
    component.emailText.set('   ');
    fixture.detectChanges();

    expect((util.analyzeButtonElement().nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('should pass configured options to model selector', () => {
    expect(util.select()).toBeTruthy();
    expect(component.models.length).toBe(5);
    expect(component.models.map((model) => model.name)).toContain('GPT-4.1');
    expect(component.models.map((model) => model.name)).toContain('Bielik 2 (4-bit)');
  });

  it('should update text fields via DOM events', async () => {
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    (util.senderInputElement().nativeElement as HTMLInputElement).value = 'author@example.com';
    (util.senderInputElement().nativeElement as HTMLInputElement).dispatchEvent(new Event('input'));

    (util.titleInputElement().nativeElement as HTMLInputElement).value = 'Monthly update';
    (util.titleInputElement().nativeElement as HTMLInputElement).dispatchEvent(new Event('input'));

    (util.textareaElement().nativeElement as HTMLTextAreaElement).value = 'Example body';
    (util.textareaElement().nativeElement as HTMLTextAreaElement).dispatchEvent(new Event('input'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.sender()).toBe('author@example.com');
    expect(component.title()).toBe('Monthly update');
    expect(component.emailText()).toBe('Example body');
    expect(fixture.nativeElement.textContent).toContain('12 characters');
  });

  it('should update selected model through ngModel binding', () => {
    const selectNgModel = util.select().injector.get(NgModel);

    selectNgModel.control.setValue(AiModelId.BIELIK_2_4BIT);
    fixture.detectChanges();

    expect(component.selectedModel()).toBe(AiModelId.BIELIK_2_4BIT);
  });

  it('should keep controls enabled and show Analyze label when not loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentInstance.emailText.set('Example body');
    fixture.detectChanges();

    expect((util.selectElement().nativeElement as HTMLElement).className).not.toContain(
      'p-disabled'
    );
    expect((util.senderInputElement().nativeElement as HTMLInputElement).disabled).toBe(false);
    expect((util.titleInputElement().nativeElement as HTMLInputElement).disabled).toBe(false);
    expect((util.textareaElement().nativeElement as HTMLTextAreaElement).disabled).toBe(false);
    expect((util.analyzeButtonElement().nativeElement as HTMLButtonElement).disabled).toBe(false);
    expect((util.analyzeButtonElement().nativeElement as HTMLButtonElement).textContent).toContain(
      'Analyze'
    );
  });

  it('should not render external error block when error input is empty', () => {
    fixture.componentRef.setInput('externalError', '');
    fixture.detectChanges();

    expect(util.errorMessage()).toBeNull();
  });

  it('should call onAnalyze when analyze button is clicked', () => {
    fixture.componentRef.setInput('loading', false);
    component.emailText.set('click coverage body');
    fixture.detectChanges();

    const onAnalyzeSpy = vi.spyOn(component, 'onAnalyze');
    (util.analyzeButtonElement().nativeElement as HTMLButtonElement).click();

    expect(onAnalyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('should call clear when clear button is clicked', () => {
    fixture.componentRef.setInput('loading', false);
    component.emailText.set('to clear');
    component.sender.set('sender@example.com');
    component.title.set('subject');
    fixture.detectChanges();

    const clearSpy = vi.spyOn(component, 'clear');
    (util.clearButtonElement().nativeElement as HTMLButtonElement).click();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
