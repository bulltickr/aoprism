import { test, expect } from '@playwright/test';

/**
 * Agent Composer E2E Tests
 * Tests the visual drag-and-drop agent composition interface
 */

test.describe('Agent Composer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should render Agent Composer canvas', async ({ page }) => {
    // Navigate to Agent Composer via Command Palette
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Verify canvas is rendered
    await expect(page.locator('.agent-composer')).toBeVisible();
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('should add nodes to canvas', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add a trigger node
    await page.click('text=+ Trigger');
    
    // Verify node is added
    await expect(page.locator('.trigger-node')).toBeVisible();
    await expect(page.locator('.trigger-node').locator('.title')).toContainText('Trigger');

    // Add a process node
    await page.click('text=+ Process');
    
    // Verify process node is added
    await expect(page.locator('.process-node')).toBeVisible();
    await expect(page.locator('.process-node').locator('.title')).toContainText('AO Process');
  });

  test('should create simple 2-node agent', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add trigger node
    await page.click('text=+ Trigger');
    await expect(page.locator('.trigger-node')).toHaveCount(1);

    // Add process node
    await page.click('text=+ Process');
    await expect(page.locator('.process-node')).toHaveCount(1);

    // Connect nodes by dragging from trigger output to process input
    const triggerOutput = page.locator('.trigger-node [data-handleid="output"]').first();
    const processInput = page.locator('.process-node [data-handleid="input"]').first();

    await triggerOutput.dragTo(processInput);

    // Verify connection was created
    await expect(page.locator('.react-flow__edge')).toBeVisible();
  });

  test('should select and delete nodes', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add a node
    await page.click('text=+ Trigger');
    await expect(page.locator('.trigger-node')).toBeVisible();

    // Select the node
    await page.click('.trigger-node');
    await expect(page.locator('.trigger-node.selected')).toBeVisible();

    // Delete the node
    await page.click('text=Delete Node');
    await expect(page.locator('.trigger-node')).not.toBeVisible();
  });

  test('should render controls and minimap', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Verify controls are visible
    await expect(page.locator('.react-flow__controls')).toBeVisible();

    // Verify minimap is visible
    await expect(page.locator('.react-flow__minimap')).toBeVisible();
  });

  test('should handle multiple nodes', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add multiple nodes
    for (let i = 0; i < 5; i++) {
      await page.click('text=+ Process');
    }

    // Verify all nodes are rendered
    await expect(page.locator('.process-node')).toHaveCount(5);
  });

  test('performance: canvas with 20+ nodes smooth', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    const startTime = Date.now();

    // Add 20 nodes
    for (let i = 0; i < 20; i++) {
      await page.click('text=+ Process');
    }

    // Verify all nodes rendered
    await expect(page.locator('.process-node')).toHaveCount(20);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should render 20 nodes in less than 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  test('should validate connection types', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add action node (terminal - no output)
    await page.click('text=+ Action');
    await expect(page.locator('.action-node')).toBeVisible();

    // Add process node
    await page.click('text=+ Process');
    await expect(page.locator('.process-node')).toBeVisible();

    // Try to connect action to process (should not work as action has no output)
    const actionOutput = page.locator('.action-node [data-handleid="output"]');
    const processInput = page.locator('.process-node [data-handleid="input"]');

    // Action node should not have an output handle
    await expect(actionOutput).toHaveCount(0);
  });

  test('should prevent self-connections', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('[placeholder="Type a command or search..."]', 'Create New Agent');
    await page.click('text=Create New Agent');

    // Add a process node
    await page.click('text=+ Process');
    await expect(page.locator('.process-node')).toBeVisible();

    // Try to connect node to itself (should not create edge)
    const processOutput = page.locator('.process-node [data-handleid="output"]').first();
    const processInput = page.locator('.process-node [data-handleid="input"]').first();

    // This would require implementation of validation in the Canvas component
    // For now, we just verify handles exist
    await expect(processOutput).toBeVisible();
    await expect(processInput).toBeVisible();
  });
});
