import { expect, test } from '@playwright/test';
import { setEmailText } from '../helpers/analyzer-form.helper';

test.describe('Analyzer request behavior e2e', () => {
  test('sends expected analyze payload', async ({ page }) => {
    let receivedPayload: Record<string, unknown> | null = null;

    await page.route('http://localhost:8000/analyze', async (route) => {
      receivedPayload = route.request().postDataJSON() as Record<string, unknown>;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'gpt-4.1',
          sender: 'payload@example.com',
          title: 'Payload Test Subject',
          prediction: 'safe',
          reason: 'No phishing indicators',
          timestamp: '2026-03-04T10:00:00Z',
          response_time_ms: 210,
        }),
      });
    });

    await page.goto('/');

    await page.locator('[data-testid="sender-input"]').fill('payload@example.com');
    await page.locator('[data-testid="title-input"]').fill('Payload Test Subject');
    await setEmailText(page, 'This is a payload verification email body.');

    await page.getByRole('button', { name: /Analyze/i }).click();
    await expect(page.getByText('Analysis Result')).toBeVisible();

    expect(receivedPayload).toEqual(
      expect.objectContaining({
        email_text: 'This is a payload verification email body.',
      })
    );
    expect(receivedPayload).toHaveProperty('sender');
    expect(receivedPayload).toHaveProperty('title');
    expect(receivedPayload).toHaveProperty('model_name');
  });

  test('disables form controls while analysis is in progress', async ({ page }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route('http://localhost:8000/analyze', async (route) => {
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'gpt-4.1',
          sender: 'loading@example.com',
          title: 'Loading state subject',
          prediction: 'safe',
          reason: 'Looks legitimate',
          timestamp: '2026-03-04T10:00:00Z',
          response_time_ms: 400,
        }),
      });
    });

    await page.goto('/');

    await page.locator('[data-testid="sender-input"]').fill('loading@example.com');
    await page.locator('[data-testid="title-input"]').fill('Loading state subject');
    await setEmailText(page, 'Please verify loading state behavior while request is pending.');

    await page.getByRole('button', { name: /Analyze/i }).click();

    await expect(page.getByRole('combobox', { name: /GPT-4.1/i })).toBeDisabled();
    await expect(page.locator('[data-testid="sender-input"]')).toBeDisabled();
    await expect(page.locator('[data-testid="title-input"]')).toBeDisabled();
    await expect(page.locator('[data-testid="email-input"]')).toBeDisabled();
    await expect(page.locator('[data-testid="analyze-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="clear-button"]')).toBeDisabled();

    releaseResponse();

    await expect(page.getByText('Analysis Result')).toBeVisible();
    await expect(page.locator('[data-testid="analyze-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="clear-button"]')).toBeEnabled();
  });
});
