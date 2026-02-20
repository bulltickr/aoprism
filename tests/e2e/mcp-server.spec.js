import { test, expect } from '@playwright/test';

/**
 * MCP Server E2E Tests
 * Tests the MCP server functionality
 */

test.describe('MCP Server', () => {
    
    test('should start MCP server and respond to health check', async ({ request }) => {
        const response = await request.get('http://localhost:3000/health');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.status).toBe('ok');
    });

    test('should list available skills', async ({ request }) => {
        const response = await request.get('http://localhost:3000/skills');
        expect(response.ok()).toBeTruthy();
        const skills = await response.json();
        expect(Array.isArray(skills)).toBeTruthy();
    });

    test('should execute a skill', async ({ request }) => {
        const response = await request.post('http://localhost:3000/execute', {
            data: {
                skill: 'math',
                params: { operation: 'add', a: 5, b: 3 }
            }
        });
        expect(response.ok()).toBeTruthy();
        const result = await response.json();
        expect(result.result).toBe(8);
    });

    test('should handle skill errors gracefully', async ({ request }) => {
        const response = await request.post('http://localhost:3000/execute', {
            data: {
                skill: 'unknown-skill',
                params: {}
            }
        });
        expect(response.status()).toBe(404);
    });

    test('should validate skill parameters', async ({ request }) => {
        const response = await request.post('http://localhost:3000/execute', {
            data: {
                skill: 'math',
                params: { invalid: true }
            }
        });
        expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('performance: skill execution < 100ms', async ({ request }) => {
        const start = Date.now();
        await request.post('http://localhost:3000/execute', {
            data: {
                skill: 'math',
                params: { operation: 'add', a: 1, b: 1 }
            }
        });
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
    });
});
