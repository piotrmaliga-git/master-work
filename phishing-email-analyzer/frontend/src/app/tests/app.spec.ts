import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppComponent } from '../app';

describe('App', () => {
  const util = {
    routerOutlet(fixture: ComponentFixture<AppComponent>): DebugElement {
      return fixture.debugElement.query(By.css('[data-testid="app-router-outlet"]'));
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router outlet', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();

    expect(util.routerOutlet(fixture)).toBeTruthy();
  });
});
