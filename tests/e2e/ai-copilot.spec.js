import { test, expect } from '@playwright/test';

/**
 * AI Copilot E2E Tests
 * Tests the AI assistant integration
 */

test.describe('AI Copilot', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should render AI copilot interface', async ({ page }) => {
        await expect(page.locator('[data-testid="ai-copilot"]')).toBeVisible();
    });

    test('should accept user input', async ({ page }) => {
        await page.fill('[data-testid="ai-input"]', 'Create a math agent');
        await expect(page.locator('[data-testid="ai-input"]')).toHaveValue('Create a math agent');
    });

    test('should send message to AI', async ({ page }) => {
        await page.fill('[data-testid="ai-input"]', 'Hello AI');
        await page.click('[data-testid="send-message-btn"]');
        
        await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
    });

    test('should receive AI response', async ({ page }) => {
        await page.fill('[data-testid="ai-input"]', 'What can you do?');
        await page.click('[data-testid="send-message-btn"]');
        
        // Wait for AI response
        await page.waitForSelector('[data-testid="ai-message"]', { timeout: 5000 });
        await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
    });

    test('should handle AI errors gracefully', async ({ page }) => {
        // Simulate network error or invalid request
        await page.route('**/api/ai/**', route => route.abort('failed'));
        
        await page.fill('[data-testid="ai-input"]', 'Test message');
        await page.click('[data-testid="send-message-btn"]');
        
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should maintain conversation context', async ({ page }) => {
        await page.fill('[data-testid="ai-input"]', 'My name is Test');
        await page.click('[data-testid="send-message-btn"]');
        await page.waitForSelector('[data-testid="ai-message"]');
        
        await page.fill('[data-testid="ai-input"]', 'What is my name?');
        await page.click('[data-testid="send-message-btn"]');
        await page.waitForSelector('[data-testid="ai-message"]:nth-child(4)');
        
        const lastMessage = await page.locator('[data-testid="ai-message"]:last-child').textContent();
        expect(lastMessage.toLowerCase()).toContain('test');
    });

    test('performance: AI response < 3s', async ({ page }) => {
        await page.fill('[data-testid="ai-input"]', 'Simple question');
        
        const start = Date.now();
        await page.click('[data-testid="send-message-btn"]');
        await page.waitForSelector('[data-testid="ai-message"]', { timeout: 5000 });
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(3000);
    });
});
