import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi } from './helpers';

const ENVELOPE = (data: unknown) => JSON.stringify({ code: 0, message: 'ok', data });

async function setupDashboard(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page);
  await mockDashboardApi(page);
}

test.describe('Dashboard Page', () => {

  test('Dashboard loads with stat cards', async ({ page }) => {
    await setupDashboard(page);
    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-page')).toBeVisible();
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible();

    // Check all stat labels
    await expect(page.locator('.dashboard-stat-label', { hasText: '用例总数' })).toBeVisible();
    await expect(page.locator('.dashboard-stat-label', { hasText: '通过率' })).toBeVisible();
    await expect(page.locator('.dashboard-stat-label', { hasText: '已通过' })).toBeVisible();
    await expect(page.locator('.dashboard-stat-label', { hasText: '失败' })).toBeVisible();
  });

  test('Loading state shows spinner', async ({ page }) => {
    await mockProjectLayoutApis(page);

    // Delay the dashboard API so loading state is visible
    await page.route('**/api/v1/projects/1/dashboard', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ENVELOPE({
          totalCases: 0,
          coveredCases: 0,
          passedCases: 0,
          failedCases: 0,
          blockedCases: 0,
          passRate: 0,
          recentActivity: [],
        }),
      });
    });

    await page.goto('/projects/1/dashboard');
    await expect(page.locator('.page-status.loading')).toBeVisible();
    // Wait for loading to resolve
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible({ timeout: 5000 });
  });

  test('Status distribution bar is rendered', async ({ page }) => {
    await setupDashboard(page);
    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-status-breakdown')).toBeVisible();
    await expect(page.locator('.dashboard-status-bar')).toBeVisible();
    await expect(page.locator('.dashboard-legend-item').first()).toBeVisible();
  });

  test('Quality trend chart section exists', async ({ page }) => {
    await setupDashboard(page);
    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-section-header', { hasText: '质量趋势' })).toBeVisible();
    await expect(page.locator('.dashboard-chart-wrapper')).toBeVisible();
  });

  test('Recent activity list renders', async ({ page }) => {
    await setupDashboard(page);
    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-section-header', { hasText: '最近活动' })).toBeVisible();
  });

  test('Refresh button reloads data', async ({ page }) => {
    await setupDashboard(page);
    await page.goto('/projects/1/dashboard');

    // Wait for initial load
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible();

    // Click refresh
    await page.locator('button', { hasText: '刷新' }).click();

    // Stats should still be visible after refresh
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible({ timeout: 5000 });
  });

  test('Error state shows retry button', async ({ page }) => {
    await mockProjectLayoutApis(page);

    // Mock dashboard API to return 500
    await page.route('**/api/v1/projects/1/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: -1, message: 'Internal Server Error', data: null }),
      });
    });

    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.dashboard-error button', { hasText: '重试' })).toBeVisible();
  });
});
