import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from '../../components/footer/footer.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  const util = {
    copyrightText(): DebugElement {
      return fixture.debugElement.query(By.css(`[data-testid="footer-copyright"]`));
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render copyright text', () => {
    expect(util.copyrightText()).toBeTruthy();
    expect(util.copyrightText().nativeElement.textContent?.trim()).toBe(
      '© 2026 Phishing Email Analyzer. All rights reserved.'
    );
  });
});
