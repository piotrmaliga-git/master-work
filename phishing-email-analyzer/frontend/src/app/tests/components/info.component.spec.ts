import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfoComponent } from '../../components/info/info.component';

describe('InfoComponent', () => {
  let fixture: ComponentFixture<InfoComponent>;

  const util = {
    infoCard(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="info-card"]'));
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoComponent);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render available models section', () => {
    const cardText = (util.infoCard().nativeElement as HTMLElement).textContent;

    expect(cardText).toContain('Available Models');
    expect(cardText).toContain('GPT-4.1:');
    expect(cardText).toContain('Latest OpenAI model');
    expect(cardText).toContain('Bielik 2 (4-bit)');
  });
});
