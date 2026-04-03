import { type DebugElement } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NotFoundPageComponent } from './not-found.component';

describe('NotFoundPageComponent', () => {
  let fixture: ComponentFixture<NotFoundPageComponent>;

  const util = {
    homeLink(): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="not-found-home-link"]'));
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render 404 page content and navigation link', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('404');
    expect(compiled.textContent).toContain('Page not found');
    expect((util.homeLink().nativeElement as HTMLAnchorElement).textContent).toContain(
      'Go back to home'
    );
  });
});
