import { expect, test } from '@playwright/test';
import { AnalyzerPage } from '../../page-objects/analyzer.page';

test.describe('Home page visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('light');
  });

  test('empty state - light theme', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.gotoHome();
    await analyzerPage.expectAnalyzeVisible();

    await expect(page).toHaveScreenshot(['home-page', 'light', 'home-empty.png'], {
      fullPage: true,
    });
  });

  test('empty state - dark theme', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('dark');

    await analyzerPage.gotoHome();
    await analyzerPage.expectAnalyzeVisible();

    await expect(page).toHaveScreenshot(['home-page', 'dark', 'home-empty.png'], {
      fullPage: true,
    });
  });

  test('form filled - ready to submit', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.gotoHome();
    await analyzerPage.fillForm(
      'attacker@phishing.com',
      'Urgent: Verify Your Account',
      'Please click this link immediately to reset your password.'
    );
    await analyzerPage.expectAnalyzeEnabled();

    await expect(page).toHaveScreenshot(['home-page', 'light', 'home-form-filled.png'], {
      fullPage: true,
    });
  });

  test('loading state - controls disabled', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'gpt-4.1',
          sender: 'loading@example.com',
          title: 'Loading state',
          prediction: 'safe',
          reason: 'Looks legitimate',
          timestamp: '2026-03-04T10:00:00Z',
          response_time_ms: 400,
        }),
      });
    });

    await analyzerPage.gotoHome();
    await analyzerPage.fillForm(
      'loading@example.com',
      'Loading state',
      'Please verify loading state behavior while request is pending.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectAnalyzeDisabled();

    await expect(page).toHaveScreenshot(['home-page', 'light', 'home-loading.png'], {
      fullPage: true,
    });

    releaseResponse();
  });
});
