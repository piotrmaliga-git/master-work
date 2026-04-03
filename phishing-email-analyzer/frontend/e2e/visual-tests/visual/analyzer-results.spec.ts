import { expect, test } from '@playwright/test';
import { AnalyzerPage } from '../../page-objects/analyzer.page';

const STUB_BASE = {
  sender: 'attacker@example.com',
  title: 'Urgent: Verify Your Account',
  timestamp: '2026-03-04T10:00:00Z',
  response_time_ms: 321,
};

test.describe('Analyzer results visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('light');
  });

  test('phishing prediction result', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...STUB_BASE,
          model: 'gpt-4.1',
          prediction: 'phishing',
          reason: 'Contains urgent credential reset request with suspicious external link.',
        }),
      });
    });

    await analyzerPage.gotoHome();
    await analyzerPage.fillForm(
      STUB_BASE.sender,
      STUB_BASE.title,
      'Urgent: click this link now and re-enter your company password.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectResultsVisible();

    await expect(page).toHaveScreenshot(['analyzer-results', 'light', 'result-phishing.png'], {
      fullPage: true,
      mask: analyzerPage.resultDynamicRowsMask,
    });
  });

  test('safe prediction result', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...STUB_BASE,
          model: 'gpt-4.1',
          prediction: 'safe',
          reason: 'Email appears to be a standard business communication with no suspicious links.',
        }),
      });
    });

    await analyzerPage.gotoHome();
    await analyzerPage.fillForm(
      STUB_BASE.sender,
      STUB_BASE.title,
      'Hello, please find attached the quarterly report. Best regards.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectResultsVisible();

    await expect(page).toHaveScreenshot(['analyzer-results', 'light', 'result-safe.png'], {
      fullPage: true,
      mask: analyzerPage.resultDynamicRowsMask,
    });
  });

  test('backend error state', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });

    await analyzerPage.gotoHome();
    await analyzerPage.fillEmailOnly('Test email body for error state.');
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectBackendErrorVisible('Internal server error');

    await expect(page).toHaveScreenshot(['analyzer-results', 'light', 'result-error.png'], {
      fullPage: true,
    });
  });

  test('phishing prediction - dark theme', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('dark');

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...STUB_BASE,
          model: 'gpt-4.1',
          prediction: 'phishing',
          reason: 'Contains urgent credential reset request with suspicious external link.',
        }),
      });
    });

    await analyzerPage.gotoHome();
    await analyzerPage.fillForm(
      STUB_BASE.sender,
      STUB_BASE.title,
      'Urgent: click this link now and re-enter your company password.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectResultsVisible();

    await expect(page).toHaveScreenshot(['analyzer-results', 'dark', 'result-phishing.png'], {
      fullPage: true,
      mask: analyzerPage.resultDynamicRowsMask,
    });
  });
});
