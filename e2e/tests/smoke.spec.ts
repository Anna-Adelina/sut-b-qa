import { test, expect } from '@playwright/test';

test('UI магазину відкривається', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ваше замовлення — у деталях.');
  await expect(page.getByTestId('order-form')).toBeVisible();
});