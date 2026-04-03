import { expect, test } from '@playwright/test';
import { NotFoundPage } from '../../page-objects/not-found.page';

test.describe('Not found page visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);
    await notFoundPage.setTheme('light');
  });

  test('404 page - light theme', async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);
    await notFoundPage.goto();
    await notFoundPage.expectLoaded();

    await expect(page).toHaveScreenshot(['not-found', 'light', 'not-found.png'], {
      fullPage: true,
    });
  });

  test('404 page - dark theme', async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);
    await notFoundPage.setTheme('dark');
    await notFoundPage.goto();
    await notFoundPage.expectLoaded();

    await expect(page).toHaveScreenshot(['not-found', 'dark', 'not-found.png'], {
      fullPage: true,
    });
  });
});
