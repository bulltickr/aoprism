import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AOPRISM/);
});

test('loads auth screen initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Seamless Interface for Decentralized Intelligence')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
})
