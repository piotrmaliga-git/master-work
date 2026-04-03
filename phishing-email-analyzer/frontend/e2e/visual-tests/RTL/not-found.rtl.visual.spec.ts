import { expect, type Page, test } from '@playwright/test';
import { NotFoundPage } from '../../page-objects/not-found.page';

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

test.describe('NotFound RTL visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    await setRtlDirection(page);
  });

  test('light 404 screen', async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);
    await notFoundPage.setTheme('light');
    await notFoundPage.goto();
    await enforceRtlDirection(page);
    await notFoundPage.expectLoaded();

    await expect(page).toHaveScreenshot(['not-found', 'light', 'not-found.png'], {
      fullPage: true,
    });
  });

  test('dark 404 screen', async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);
    await notFoundPage.setTheme('dark');
    await notFoundPage.goto();
    await enforceRtlDirection(page);
    await notFoundPage.expectLoaded();

    await expect(page).toHaveScreenshot(['not-found', 'dark', 'not-found.png'], {
      fullPage: true,
    });
  });
});
