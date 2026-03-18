import { expect, test } from '@playwright/test';

test.describe('Navigation e2e', () => {
  test('navigating to unknown route shows not found page and allows return home', async ({
    page,
  }) => {
    await page.goto('/not-existing-route');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Page not found.')).toBeVisible();

    await page.getByRole('link', { name: 'Go back to home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: /Phishing Email/i })).toBeVisible();
  });
});
