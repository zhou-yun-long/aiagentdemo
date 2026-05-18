import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi } from './helpers';

test.describe('Navigation & Routing', () => {

  test('Root redirects to /projects', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('.projects-page h1')).toHaveText('项目管理');
  });

  test('Project sub-route redirects to dashboard', async ({ page }) => {
    await mockProjectLayoutApis(page);
    await mockDashboardApi(page);
    await page.goto('/projects/1');
    await expect(page).toHaveURL(/\/projects\/1\/dashboard/);
  });

  test('Legacy /cases redirects to projects', async ({ page }) => {
    await page.goto('/cases');
    await expect(page).toHaveURL(/\/projects/);
  });

  test('Sidebar navigation links work', async ({ page }) => {
    await mockProjectLayoutApis(page);
    await mockDashboardApi(page);
    // Mock cases workspace APIs
    await page.route('**/api/v1/projects/1/cases', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: [] }) });
    });
    // Mock plans API
    await page.route('**/api/v1/projects/1/plans', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: [] }) });
    });
    // Mock reports API
    await page.route('**/api/v1/projects/1/reports', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: [] }) });
    });

    await page.goto('/projects/1/dashboard');
    await expect(page).toHaveURL(/\/projects\/1\/dashboard/);

    // Click sidebar nav items
    await page.locator('.sidebar-nav-item', { hasText: '用例管理' }).click();
    await expect(page).toHaveURL(/\/projects\/1\/cases/);

    await page.locator('.sidebar-nav-item', { hasText: '测试计划' }).click();
    await expect(page).toHaveURL(/\/projects\/1\/plans/);

    await page.locator('.sidebar-nav-item', { hasText: '测试报告' }).click();
    await expect(page).toHaveURL(/\/projects\/1\/reports/);

    await page.locator('.sidebar-nav-item', { hasText: '仪表盘' }).click();
    await expect(page).toHaveURL(/\/projects\/1\/dashboard/);
  });

  test('Breadcrumb shows correct hierarchy', async ({ page }) => {
    await mockProjectLayoutApis(page);
    await mockDashboardApi(page);
    await page.route('**/api/v1/projects/1/plans', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data: [] }) });
    });

    await page.goto('/projects/1/dashboard');
    await expect(page.locator('.top-bar-breadcrumb')).toContainText('项目');
    await expect(page.locator('.top-bar-module')).toHaveText('仪表盘');

    await page.locator('.sidebar-nav-item', { hasText: '测试计划' }).click();
    await expect(page.locator('.top-bar-module')).toHaveText('测试计划');
  });

  test('Back button from project page returns to project list', async ({ page }) => {
    await mockProjectLayoutApis(page);
    await mockDashboardApi(page);
    await page.goto('/projects/1/dashboard');
    await page.locator('.top-bar-link').click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
