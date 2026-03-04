import { expect, test } from '@playwright/test';

const setEmailText = async (page: import('@playwright/test').Page, text: string) => {
  const textarea = page.locator('#email-input');
  const analyzeButton = page.getByRole('button', { name: /Analyze/i });

  await textarea.fill(text);

  if (await analyzeButton.isDisabled()) {
    await page.evaluate((value) => {
      const el = document.querySelector<HTMLTextAreaElement>('#email-input');
      if (!el) {
        return;
      }
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, text);
  }

  await expect(analyzeButton).toBeEnabled();
};

test.describe('Phishing analyzer e2e', () => {
  test('clear button resets form fields', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Select AI Model:').selectOption('gpt-4.1');
    await page.getByLabel('Sender Email:').fill('sender@example.com');
    await setEmailText(page, 'Suspicious email body for testing clear action.');

    await page.getByRole('button', { name: /Clear/i }).click();

    await expect(page.locator('#model-select')).toHaveValue('gpt-4.1');
    await expect(page.locator('#sender-input')).toHaveValue('');
    await expect(page.locator('#email-input')).toHaveValue('');
    await expect(page.getByRole('button', { name: /Analyze/i })).toBeDisabled();
  });

  test('analyzes email and renders result', async ({ page }) => {
    await page.route('http://localhost:8000/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'gpt-4.1',
          sender: 'attacker@example.com',
          prediction: 'phishing',
          reason: 'Contains urgent credential reset request',
          timestamp: '2026-03-04T10:00:00Z',
        }),
      });
    });

    await page.goto('/');

    await page.getByLabel('Select AI Model:').selectOption('gpt-4.1');
    await page.getByLabel('Sender Email:').fill('attacker@example.com');
    await setEmailText(page, 'Urgent: click this link now and re-enter your company password.');

    await page.getByRole('button', { name: /Analyze/i }).click();

    await expect(page.getByRole('heading', { name: 'Analysis Result' })).toBeVisible();
    await expect(
      page.locator("xpath=//span[normalize-space()='Model:']/following-sibling::span[1]")
    ).toHaveText('gpt-4.1');
    await expect(
      page.locator("xpath=//span[normalize-space()='Sender:']/following-sibling::span[1]")
    ).toHaveText('attacker@example.com');
    await expect(page.getByText('PHISHING', { exact: true })).toBeVisible();
    await expect(page.getByText('Contains urgent credential reset request')).toBeVisible();
  });

  test('shows backend error message when analyze fails', async ({ page }) => {
    await page.route('http://localhost:8000/analyze', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Backend unavailable for test' }),
      });
    });

    await page.goto('/');

    await setEmailText(page, 'Test email body');
    await page.getByRole('button', { name: /Analyze/i }).click();

    await expect(page.getByText('❌ Backend unavailable for test')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analysis Result' })).toHaveCount(0);
  });

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
