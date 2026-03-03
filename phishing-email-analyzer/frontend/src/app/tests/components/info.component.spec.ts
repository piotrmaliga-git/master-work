import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoComponent } from '../../components/info/info.component';

describe('InfoComponent', () => {
  let fixture: ComponentFixture<InfoComponent>;

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
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Available Models');
    expect(compiled.textContent).toContain('GPT-4.1 (New)');
    expect(compiled.textContent).toContain('Bielik 2 (4-bit)');
  });
});
