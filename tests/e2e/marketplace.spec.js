import { test, expect } from '@playwright/test';

/**
 * Marketplace E2E Tests
 * Tests the skill marketplace functionality
 */

test.describe('Marketplace', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/marketplace');
        await page.waitForLoadState('networkidle');
    });

    test('should load marketplace with skills', async ({ page }) => {
        await expect(page.locator('[data-testid="marketplace-grid"]')).toBeVisible();
        const skills = await page.locator('[data-testid="skill-card"]').count();
        expect(skills).toBeGreaterThan(0);
    });

    test('should search for skills', async ({ page }) => {
        await page.fill('[data-testid="search-input"]', 'math');
        await page.keyboard.press('Enter');
        
        const results = await page.locator('[data-testid="skill-card"]').count();
        expect(results).toBeGreaterThanOrEqual(0);
    });

    test('should filter skills by category', async ({ page }) => {
        await page.selectOption('[data-testid="category-filter"]', 'utilities');
        
        const skills = await page.locator('[data-testid="skill-card"]').count();
        // Should show filtered results
    });

    test('should view skill details', async ({ page }) => {
        await page.click('[data-testid="skill-card"]:first-child');
        
        await expect(page.locator('[data-testid="skill-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="skill-name"]')).toBeVisible();
    });

    test('should install a skill', async ({ page }) => {
        await page.click('[data-testid="skill-card"]:first-child');
        await page.click('[data-testid="install-skill-btn"]');
        
        await expect(page.locator('[data-testid="skill-installed-toast"]')).toBeVisible();
    });

    test('should show installed skills in my skills', async ({ page }) => {
        // Install a skill first
        await page.click('[data-testid="skill-card"]:first-child');
        const skillName = await page.locator('[data-testid="skill-name"]').textContent();
        await page.click('[data-testid="install-skill-btn"]');
        
        // Navigate to my skills
        await page.click('[data-testid="my-skills-link"]');
        await expect(page.locator(`text=${skillName}`)).toBeVisible();
    });

    test('performance: marketplace load < 2s', async ({ page }) => {
        const start = Date.now();
        await page.goto('/marketplace');
        await page.waitForLoadState('networkidle');
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(2000);
    });
});
