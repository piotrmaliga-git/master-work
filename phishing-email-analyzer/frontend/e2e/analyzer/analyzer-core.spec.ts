import { expect, test } from '@playwright/test';
import { setEmailText } from '../helpers/analyzer-form.helper';

test.describe('Analyzer core flow e2e', () => {
  test('clear button resets form fields', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-testid="sender-input"]').fill('sender@example.com');
    await setEmailText(page, 'Suspicious email body for testing clear action.');

    await page.getByRole('button', { name: /Clear/i }).click();

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
          response_time_ms: 321,
        }),
      });
    });

    await page.goto('/');

    await page.locator('[data-testid="sender-input"]').fill('attacker@example.com');
    await setEmailText(page, 'Urgent: click this link now and re-enter your company password.');

    await page.getByRole('button', { name: /Analyze/i }).click();

    await expect(page.getByText('Analysis Result')).toBeVisible();
    await expect(
      page
        .locator('.result-row')
        .filter({ hasText: /^Model/ })
        .locator('strong')
    ).toHaveText('gpt-4.1');
    await expect(
      page
        .locator('.result-row')
        .filter({ hasText: /^Sender/ })
        .locator('strong')
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

    await expect(page.getByText('Backend unavailable for test')).toBeVisible();
    await expect(page.locator('.results-wrapper')).toHaveCount(0);
  });
});
