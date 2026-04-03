import { expect, type Page, test } from '@playwright/test';
import { AnalyzerPage } from '../../page-objects/analyzer.page';

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

test.describe('Analyzer RTL visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    await setRtlDirection(page);
  });

  test('light empty state', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('light');

    await analyzerPage.gotoHome();
    await enforceRtlDirection(page);
    await analyzerPage.expectAnalyzeVisible();

    await expect(page).toHaveScreenshot(['analyzer', 'light', 'analyzer-empty-state.png'], {
      fullPage: true,
    });
  });

  test('dark filled state with error', async ({ page }) => {
    const analyzerPage = new AnalyzerPage(page);
    await analyzerPage.setTheme('dark');

    await analyzerPage.stubAnalyzeRequest(async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Backend unavailable' }),
      });
    });

    await analyzerPage.gotoHome();
    await enforceRtlDirection(page);
    await analyzerPage.fillForm(
      'sender@example.com',
      'Urgent account update',
      'Please click this link immediately.'
    );
    await analyzerPage.clickAnalyze();
    await analyzerPage.expectBackendErrorVisible('Backend unavailable');

    await expect(page).toHaveScreenshot(['analyzer', 'dark', 'analyzer-filled-with-error.png'], {
      fullPage: true,
    });
  });
});
