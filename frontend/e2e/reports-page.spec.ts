import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis } from './helpers';

const PROJECT_ID = 1;

const MOCK_REPORTS = [
  {
    id: 1,
    projectId: PROJECT_ID,
    planId: 1,
    name: '第一轮测试报告',
    planName: '回归测试计划',
    passRate: 85.0,
    totalCases: 20,
    passed: 17,
    failed: 3,
    createdAt: '2026-05-15T18:00:00Z',
  },
  {
    id: 2,
    projectId: PROJECT_ID,
    planId: 2,
    name: '冒烟测试报告',
    planName: '冒烟测试计划',
    passRate: 100.0,
    totalCases: 5,
    passed: 5,
    failed: 0,
    createdAt: '2026-04-20T18:00:00Z',
  },
];

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

async function mockReportsApi(page: import('@playwright/test').Page, reports = MOCK_REPORTS) {
  await page.route(`**/api/v1/projects/${PROJECT_ID}/reports`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(reports),
    });
  });
}

test.describe('Reports Page', () => {
  test('Reports page loads', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportsApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports`);
    await expect(page.locator('h2:has-text("测试报告")')).toBeVisible();
  });

  test('Empty state when no reports', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportsApi(page, []);

    await page.goto(`/projects/${PROJECT_ID}/reports`);
    await expect(page.locator('.page-status.empty')).toBeVisible();
  });

  test('Report table columns are correct', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportsApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports`);
    await expect(page.locator('th:has-text("报告名称")')).toBeVisible();
    await expect(page.locator('th:has-text("通过率")')).toBeVisible();
    await expect(page.locator('th:has-text("关联计划")')).toBeVisible();
    await expect(page.locator('th:has-text("总用例")')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '通过', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '失败', exact: true })).toBeVisible();
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible();
  });

  test('Click report row navigates to detail', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportsApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports`);
    await page.locator('.cases-table tbody tr:first-child').click();
    await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/reports/`));
  });

  test('Pass rate badge shows colored text', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportsApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports`);
    await expect(
      page.locator('.cases-table tbody tr:first-child td:nth-child(2) span')
    ).toBeVisible();
  });
});
