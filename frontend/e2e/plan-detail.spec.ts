import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockCasesApi, mockPlansApi, mockSidebarApis } from './helpers';

const URL = '/projects/1/plans/1';

async function setupMocks(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page, 1);
  await mockCasesApi(page, 1);
  await mockPlansApi(page, 1);
  await mockSidebarApis(page, 1);
}

test.describe('Plan Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('Plan detail loads with header info', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');
    await expect(page.locator('.plans-status-badge')).toBeVisible();
    await expect(page.locator('.plans-meta')).toBeVisible();
  });

  test('Plan description renders when present', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    // The mock plan has a description
    await expect(page.locator('.plans-page p')).toBeVisible();
    await expect(page.locator('.plans-page p')).toContainText('V2.0');
  });

  test('Execution table shows linked cases', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-exec');

    await expect(page.locator('.plans-exec-header')).toBeVisible();
    await expect(page.locator('th:has-text("用例标题")')).toBeVisible();
    await expect(page.locator('th:has-text("执行结果")')).toBeVisible();
    await expect(page.locator('th:has-text("备注")')).toBeVisible();
    await expect(page.locator('th:has-text("当前状态")')).toBeVisible();
  });

  test('Empty execution table when no cases linked', async ({ page }) => {
    // Override plan detail API to return empty cases
    await page.unroute('**/api/v1/plans/1');
    await page.route('**/api/v1/plans/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0, message: 'ok',
            data: {
              plan: { id: 1, projectId: 1, name: '空计划', description: '', status: 'draft', startDate: null, endDate: null, createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-01T08:00:00Z', caseCount: 0, passedCount: 0 },
              cases: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(URL);
    await page.waitForSelector('.plans-exec-empty');
    await expect(page.locator('.plans-exec-empty')).toBeVisible();
    await expect(page.locator('.plans-exec-empty')).toContainText('暂未关联任何用例');
  });

  test('Update case execution result', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-exec-table');

    // The first case already has executionResult='pass'.
    // Select a different value to trigger a change, enabling the submit button.
    await page.locator('.plans-exec-select').first().selectOption('fail');

    // The submit button should now be enabled
    await expect(page.locator('.plans-exec-submit').first()).toBeEnabled();
    await page.locator('.plans-exec-submit').first().click();
  });

  test('Add note to case execution', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-exec-table');

    // Fill in a note
    await page.locator('.plans-exec-note').first().fill('自动化测试备注');

    // Submit
    await page.locator('.plans-exec-submit').first().click();
  });

  test('Submit button disabled when no changes', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-exec-table');

    // The submit button should be disabled when no changes have been made
    await expect(page.locator('.plans-exec-submit').first()).toBeDisabled();
  });

  test('Recompute status button', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-exec');

    // Click recompute
    await page.locator('button:has-text("重算状态")').click();

    // Should wait for it to complete (button text changes during recompute)
    await page.waitForSelector('button:has-text("重算状态")');
  });

  test('Back button returns to plans list', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('.back-button:has-text("返回")').click();

    await expect(page).toHaveURL(/\/plans$/);
  });

  test('Loading state shows spinner', async ({ page }) => {
    // Delay the plan detail API response to see loading state
    await page.unroute('**/api/v1/plans/1');
    await page.route('**/api/v1/plans/1', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, message: 'ok', data: { plan: { id: 1, projectId: 1, name: '测试', description: '', status: 'draft', startDate: null, endDate: null, createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-01T08:00:00Z', caseCount: 0, passedCount: 0 }, cases: [] } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(URL);
    await expect(page.locator('.plans-loading')).toBeVisible();
  });

  test('Error state shows error message', async ({ page }) => {
    // Override plan detail API to return 500
    await page.unroute('**/api/v1/plans/1');
    await page.route('**/api/v1/plans/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: -1, message: 'Internal Server Error', data: null }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(URL);
    await page.waitForSelector('.plans-error');
    await expect(page.locator('.plans-error')).toBeVisible();
  });
});
