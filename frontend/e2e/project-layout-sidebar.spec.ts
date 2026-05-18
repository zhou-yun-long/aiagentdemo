import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi } from './helpers';

const PROJECT_ID = 1;

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

// Mock the cases API needed when navigating to /cases
async function mockCasesApi(page: import('@playwright/test').Page) {
  await page.route(`**/api/v1/projects/${PROJECT_ID}/cases`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([]),
    });
  });
  await page.route(`**/api/v1/projects/${PROJECT_ID}/cases/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ total: 0, passed: 0, failed: 0, blocked: 0, passRate: 0 }),
    });
  });
}

// Mock the reports API for navigating to /reports
async function mockReportsApi(page: import('@playwright/test').Page) {
  await page.route(`**/api/v1/projects/${PROJECT_ID}/reports`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([]),
    });
  });
}

// Mock the plans API for navigating to /plans
async function mockPlansApi(page: import('@playwright/test').Page) {
  await page.route(`**/api/v1/projects/${PROJECT_ID}/plans`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([]),
    });
  });
}

test.describe('Project Layout & Sidebar', () => {
  test('Sidebar renders with navigation items', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page);

    await page.goto(`/projects/${PROJECT_ID}/dashboard`);
    await expect(page.locator('.app-sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-logo')).toBeVisible();
    await expect(page.locator('.sidebar-nav-item:has-text("仪表盘")')).toBeVisible();
    await expect(page.locator('.sidebar-nav-item:has-text("用例管理")')).toBeVisible();
    await expect(page.locator('.sidebar-nav-item:has-text("用例生成")')).toBeVisible();
    await expect(page.locator('.sidebar-nav-item:has-text("测试计划")')).toBeVisible();
    await expect(page.locator('.sidebar-nav-item:has-text("测试报告")')).toBeVisible();
  });

  test('Active sidebar item is highlighted on dashboard', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page);

    await page.goto(`/projects/${PROJECT_ID}/dashboard`);
    await expect(page.locator('.sidebar-nav-item:has-text("仪表盘")')).toHaveClass(/active/);
  });

  test('Active sidebar item is highlighted on cases', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockCasesApi(page);

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.sidebar-nav-item:has-text("用例管理")')).toHaveClass(/active/);
  });

  test('Sidebar collapse and expand', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page);

    await page.goto(`/projects/${PROJECT_ID}/dashboard`);

    // Click collapse button
    await page.locator('.sidebar-collapse-btn').click();
    await expect(page.locator('.app-sidebar')).toHaveClass(/collapsed/);

    // Click expand button
    await page.locator('.sidebar-collapse-btn').click();
    await expect(page.locator('.app-sidebar')).not.toHaveClass(/collapsed/);
  });

  test('Project switcher dropdown works', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page);

    await page.goto(`/projects/${PROJECT_ID}/dashboard`);

    // Verify the select exists and has the expected options
    const select = page.locator('.sidebar-project-select');
    await expect(select).toBeVisible();
    await expect(select.locator('option')).toHaveCount(2);
    await expect(select.locator('option').first()).toHaveText('测试项目A');
    await expect(select.locator('option').nth(1)).toHaveText('测试项目B');
  });

  test('Settings section toggles open', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page);

    await page.goto(`/projects/${PROJECT_ID}/dashboard`);
    await page.locator('.sidebar-settings-toggle').click();
    await expect(page.locator('.sidebar-settings-group')).toBeVisible();
    await expect(page.locator('.sidebar-settings-group >> text=项目管理')).toBeVisible();
    await expect(page.locator('.sidebar-settings-group >> text=知识库')).toBeVisible();
  });

  test('Breadcrumb reflects current location', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockCasesApi(page);

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.top-bar-link')).toHaveText('项目');
    await expect(page.locator('.top-bar-module')).toHaveText('用例管理');
  });

  test('Generate page loads with AI generation panel', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);

    await page.goto(`/projects/${PROJECT_ID}/generate`);
    await expect(page.locator('.generate-page')).toBeVisible();
    await expect(page.locator('h1:has-text("用例生成")')).toBeVisible();
  });
});
