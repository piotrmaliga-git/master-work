import { expect, type Page } from '@playwright/test';

export const setEmailText = async (page: Page, text: string) => {
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
