import { Theme } from './../../src/app/utils/enums/enums';
import { expect, test } from '@playwright/test';
import { HeaderPage } from '../page-objects/header.page';

test.describe('Header preferences e2e', () => {
  test('language toggle sends locale preference update', async ({ page }) => {
    const headerPage = new HeaderPage(page);
    let localePayload: Record<string, unknown> | null = null;

    await page.route('**/api/locale', async (route) => {
      localePayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    });

    await headerPage.goto('/');

    await headerPage.expectLanguageToggleText('PL');

    await headerPage.clickLanguageToggle();

    await expect.poll(() => localePayload).toEqual({ locale: 'pl' });
  });

  test('theme toggle updates document class and persisted preference', async ({ page }) => {
    const headerPage = new HeaderPage(page);
    await headerPage.setTheme('light');

    await headerPage.goto('/');

    const initiallyDark = (await headerPage.getThemeState()).isDark;

    await headerPage.clickThemeToggle();

    await expect
      .poll(async () => headerPage.getThemeState())
      .toEqual({
        isDark: !initiallyDark,
        stored: initiallyDark ? Theme.light : Theme.dark,
      });
  });
});
