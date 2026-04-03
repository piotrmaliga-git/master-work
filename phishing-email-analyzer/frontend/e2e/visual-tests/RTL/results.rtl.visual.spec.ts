import { expect, type Page, test } from '@playwright/test';
import { AnalyzerPage } from '../../page-objects/analyzer.page';

const STUB_BASE = {
  model: 'gpt-4.1',
  reason: 'Contains urgent credential reset request',
  timestamp: '2026-03-04T10:00:00Z',
  sender: 'attacker@example.com',
  title: 'Urgent: Verify Your Account',
  response_time_ms: 321,
} as const;

const setRtlDirection = async (page: Page) => {
  await page.addInitScript(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
};

const enforceRtlDirection = async (page: Page) => {
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
};

test.describe('Results RTL visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    await setRtlDirection(page);
  });

  test('light phishing result', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('light');

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...STUB_BASE,
          prediction: 'phishing',
          reason: 'Contains urgent credential reset request with suspicious external link.',
        }),
      });
    });

    await analyzerPage.gotoHome();
    await enforceRtlDirection(page);
    await analyzerPage.fillForm(
      STUB_BASE.sender,
      STUB_BASE.title,
      'Urgent: click this link now and re-enter your company password.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectResultsVisible();

    await expect(page).toHaveScreenshot(['results', 'light', 'result-phishing.png'], {
      fullPage: true,
      mask: analyzerPage.resultDynamicRowsMask,
    });
  });

  test('dark legit result', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('dark');

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...STUB_BASE,
          prediction: 'legit',
          reason: 'Email appears to be a standard business communication with no suspicious links.',
        }),
      });
    });

    await analyzerPage.gotoHome();
    await enforceRtlDirection(page);
    await analyzerPage.fillForm(
      STUB_BASE.sender,
      STUB_BASE.title,
      'Hello, please find attached the quarterly report. Best regards.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectResultsVisible();

    await expect(page).toHaveScreenshot(['results', 'dark', 'result-legit.png'], {
      fullPage: true,
      mask: analyzerPage.resultDynamicRowsMask,
    });
  });
});
