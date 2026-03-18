import { expect, test } from '@playwright/test';

test.describe('Header preferences e2e', () => {
  test('language toggle sends locale preference update', async ({ page }) => {
    let localePayload: Record<string, unknown> | null = null;

    await page.route('**/api/locale', async (route) => {
      localePayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    });

    await page.goto('/pl?source=e2e#section');

    await expect(page.locator('[data-testid="language-toggle"]')).toHaveText('EN');

    await page.locator('[data-testid="language-toggle"]').click();

    await expect.poll(() => localePayload).toEqual({ locale: 'en' });
  });

  test('theme toggle updates document class and persisted preference', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('app-theme-mode');
    });

    await page.goto('/');

    const initiallyDark = await page.evaluate(() =>
      document.documentElement.classList.contains('app-dark')
    );

    await page.locator('[data-testid="theme-toggle"]').click();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          isDark: document.documentElement.classList.contains('app-dark'),
          stored: localStorage.getItem('app-theme-mode'),
        }))
      )
      .toEqual({
        isDark: !initiallyDark,
        stored: initiallyDark ? 'light' : 'dark',
      });
  });
});
