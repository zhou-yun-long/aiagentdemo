import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockCasesApi, mockPlansApi, mockSidebarApis } from './helpers';

const URL = '/projects/1/plans';

async function setupMocks(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page, 1);
  await mockCasesApi(page, 1);
  await mockPlansApi(page, 1);
  await mockSidebarApis(page, 1);
}

test.describe('Plans Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('Plans page loads with table', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.plans-page')).toBeVisible();
    await expect(page.locator('h1:has-text("测试计划")')).toBeVisible();
  });

  test('Empty state when no plans', async ({ page }) => {
    // Override plans API to return empty array
    await page.unroute('**/api/v1/projects/1/plans');
    await page.route('**/api/v1/projects/1/plans', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'ok', data: [] }),
      });
    });

    await page.goto(URL);
    await page.waitForSelector('.plans-empty', { timeout: 5000 });
    await expect(page.locator('.plans-empty')).toBeVisible();
    await expect(page.locator('.plans-empty')).toContainText('暂无测试计划');
  });

  test('Plan table columns are correct', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-table');

    await expect(page.locator('th:has-text("计划名称")')).toBeVisible();
    await expect(page.locator('th:has-text("状态")')).toBeVisible();
    await expect(page.locator('th:has-text("用例数")')).toBeVisible();
    await expect(page.locator('th:has-text("通过数")')).toBeVisible();
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible();
    await expect(page.locator('th:has-text("更新时间")')).toBeVisible();
    await expect(page.locator('th:has-text("操作")')).toBeVisible();
  });

  test('Plan status badges render correctly', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-table');
    await expect(page.locator('.plans-status-badge').first()).toBeVisible();
  });

  test('Create plan modal opens', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('button:has-text("新建计划")').click();
    await expect(page.locator('.plans-modal h2:has-text("新建测试计划")')).toBeVisible();
    await expect(page.locator('#plan-name')).toBeVisible();
    await expect(page.locator('#plan-desc')).toBeVisible();
  });

  test('Create plan with name and case selection', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('button:has-text("新建计划")').click();
    await expect(page.locator('.plans-modal')).toBeVisible();

    await page.locator('#plan-name').fill('E2E回归测试计划');
    await page.locator('#plan-desc').fill('自动化创建的测试计划');

    // Select all cases
    await page.locator('.plans-select-all-btn').click();
    await expect(page.locator('.plans-case-count')).toBeVisible();

    // Submit
    await page.locator('.plans-modal .primary').click();

    // Modal should close after successful submit
    await expect(page.locator('.plans-modal')).not.toBeVisible({ timeout: 5000 });
  });

  test('Create plan validates empty name', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('button:has-text("新建计划")').click();
    await expect(page.locator('.plans-modal')).toBeVisible();

    // The primary button should be disabled when name is empty
    await expect(page.locator('.plans-modal .primary')).toBeDisabled();
  });

  test('Close plan modal with Escape', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('button:has-text("新建计划")').click();
    await expect(page.locator('.plans-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.plans-modal')).not.toBeVisible();
  });

  test('Close plan modal by clicking overlay', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('button:has-text("新建计划")').click();
    await expect(page.locator('.plans-modal')).toBeVisible();

    // Click on the overlay (the parent of .plans-modal)
    await page.locator('.plans-modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.plans-modal')).not.toBeVisible();
  });

  test('Navigate to plan detail by clicking name', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-table');

    // Click the plan name link
    await page.locator('.plans-name-cell a').first().click();

    // Should navigate to plan detail
    await expect(page).toHaveURL(/\/plans\/1/);
  });

  test('Navigate to plan detail via view button', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-table');

    // Click the "查看" action link
    await page.locator('.plans-row-actions a:has-text("查看")').first().click();

    await expect(page).toHaveURL(/\/plans\/1/);
  });

  test('Delete plan with confirmation', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-table');

    // Accept the window.confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('.plans-row-actions button.danger').first().click();
  });

  test('Back button returns to dashboard', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.plans-page');

    await page.locator('.back-button:has-text("返回")').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
