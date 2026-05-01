import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveTitle(/EcoRoute/);
});

test('get started link', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: /Get Started/i }).first().click();
  await expect(page).toHaveURL(/.*sign-up/);
});
