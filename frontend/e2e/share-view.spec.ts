import { test, expect } from '@playwright/test';

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

test.describe('Share View', () => {

  test('Share view loads with read-only banner', async ({ page }) => {
    // Mock the share API to return valid share data
    await page.route('**/api/v1/share/test-token-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          mindmap: [
            { id: 'root', parentId: null, title: '分享的项目', kind: 'root', lane: 'center', depth: 0, order: 0 },
          ],
          stats: { total: 5, passed: 3, failed: 1, blocked: 1, passRate: 60.0 },
        }),
      });
    });

    // Mock any other API calls the App might make
    await page.route('**/api/v1/projects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope([]),
      });
    });

    await page.goto('/share/test-token-123');
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('.read-only-banner')).toBeVisible();
    await expect(page.locator('.read-only-banner')).toContainText('只读模式');
  });

  test('Read-only mode hides edit controls', async ({ page }) => {
    // Mock the share API to return valid share data
    await page.route('**/api/v1/share/test-token-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          mindmap: [
            { id: 'root', parentId: null, title: '分享的项目', kind: 'root', lane: 'center', depth: 0, order: 0 },
          ],
          stats: { total: 5, passed: 3, failed: 1, blocked: 1, passRate: 60.0 },
        }),
      });
    });

    // Mock other API calls
    await page.route('**/api/v1/projects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope([]),
      });
    });

    await page.goto('/share/test-token-123');
    await expect(page.locator('.app')).toBeVisible();
    // In read-only mode, the toolline (edit controls) should not be rendered
    await expect(page.locator('.toolline')).not.toBeVisible();
  });
});
