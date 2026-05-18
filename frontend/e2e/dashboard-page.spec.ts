import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi } from './helpers';

const ENVELOPE = (data: unknown) => JSON.stringify({ code: 0, message: 'ok', data });

const DASHBOARD_WITH_NEW_STATS = {
  totalCases: 42,
  coveredCases: 40,
  passedCases: 35,
  failedCases: 5,
  blockedCases: 2,
  passRate: 83.3,
  recentActivity: [
    { type: 'generation', description: '新建用例: 登录功能验证', timestamp: '2026-05-18T10:00:00Z' },
    { type: 'case_passed', description: '用例通过: 注册流程测试', timestamp: '2026-05-17T15:30:00Z' },
    { type: 'plan_created', description: '创建计划: 回归测试计划', timestamp: '2026-05-16T09:00:00Z' },
  ],
  reviewStats: {
    pending: 5,
    approved: 12,
    rejected: 2,
    needsRevision: 3,
  },
};

async function setupDashboard(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page);
  await mockDashboardApi(page);
}

async function setupDashboardWithNewStats(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page);
  await page.route('**/api/v1/projects/1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ENVELOPE(DASHBOARD_WITH_NEW_STATS),
    });
  });
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

  test('Dashboard with review stats includes reviewStats in mock data', async ({ page }) => {
    await setupDashboardWithNewStats(page);
    await page.goto('/projects/1/dashboard');

    // The dashboard should load successfully with the enriched mock
    await expect(page.locator('.dashboard-page')).toBeVisible();
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible();

    // Verify core stats still render
    await expect(page.locator('.dashboard-stat-label', { hasText: '用例总数' })).toBeVisible();
    await expect(page.locator('.dashboard-stat-label', { hasText: '通过率' })).toBeVisible();
  });

  test('Dashboard mock includes defectStats, reviewStats, and activeTokens fields', async ({ page }) => {
    // This test verifies that the mock data structure supports the new fields.
    // When the DashboardDto type adds defectStats and activeTokens, and the
    // DashboardPage renders them, this test confirms the mock wiring is correct.
    const enrichedMock = {
      ...DASHBOARD_WITH_NEW_STATS,
      defectStats: {
        total: 15,
        open: 3,
        inProgress: 5,
        resolved: 4,
        closed: 2,
        reopened: 1,
      },
      activeTokens: 2,
    };

    await mockProjectLayoutApis(page);
    await page.route('**/api/v1/projects/1/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ENVELOPE(enrichedMock),
      });
    });

    await page.goto('/projects/1/dashboard');

    // Dashboard should load without errors even with extra fields
    await expect(page.locator('.dashboard-page')).toBeVisible();
    await expect(page.locator('.dashboard-stats-grid')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard status breakdown includes blocked stat', async ({ page }) => {
    await setupDashboardWithNewStats(page);
    await page.goto('/projects/1/dashboard');

    await expect(page.locator('.dashboard-status-breakdown')).toBeVisible();
    await expect(page.locator('.dashboard-status-bar')).toBeVisible();

    // Legend items include blocked
    await expect(page.locator('.dashboard-legend-item', { hasText: '阻塞' })).toBeVisible();
    await expect(page.locator('.dashboard-legend-item', { hasText: '已通过' })).toBeVisible();
    await expect(page.locator('.dashboard-legend-item', { hasText: '失败' })).toBeVisible();
    await expect(page.locator('.dashboard-legend-item', { hasText: '未执行' })).toBeVisible();
  });

  test('Dashboard blocked stat card is rendered', async ({ page }) => {
    await setupDashboardWithNewStats(page);
    await page.goto('/projects/1/dashboard');

    // The "阻塞" stat card should be visible
    await expect(page.locator('.dashboard-stat-label', { hasText: '阻塞' })).toBeVisible();
  });

  test('Dashboard coverage stat card is rendered', async ({ page }) => {
    await setupDashboardWithNewStats(page);
    await page.goto('/projects/1/dashboard');

    // The "覆盖率" stat card should be visible
    await expect(page.locator('.dashboard-stat-label', { hasText: '覆盖率' })).toBeVisible();
  });
});
