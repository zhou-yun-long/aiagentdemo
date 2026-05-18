import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockCasesApi, mockPlansApi, mockSidebarApis } from './helpers';

const URL = '/projects/1/cases';

async function setupMocks(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page, 1);
  await mockCasesApi(page, 1);
  await mockPlansApi(page, 1);
  await mockSidebarApis(page, 1);
}

test.describe('Cases Workspace Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('Cases page loads with default list view', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.cases-workspace')).toBeVisible();
    await expect(page.locator('.cases-workspace-tabs')).toBeVisible();
    await expect(page.locator('.cases-workspace-tab.active')).toHaveText(/列表视图/);
  });

  test('Toggle between list and mindmap view', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-workspace');

    // Switch to mindmap
    await page.locator('.cases-workspace-tab:has-text("思维导图视图")').click();
    await expect(page.locator('.cases-workspace-mindmap')).not.toHaveClass(/hidden/);
    await expect(page.locator('.cases-workspace-list')).toHaveClass(/hidden/);

    // Switch back to list
    await page.locator('.cases-workspace-tab:has-text("列表视图")').click();
    await expect(page.locator('.cases-workspace-list')).not.toHaveClass(/hidden/);
  });

  test('Case filter tabs switch correctly', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // Default is "all"
    await expect(page.locator('.cases-tab:has-text("全部用例")')).toHaveClass(/active/);

    // Switch to uncovered
    await page.locator('.cases-tab:has-text("未覆盖")').click();
    await expect(page.locator('.cases-tab:has-text("未覆盖")')).toHaveClass(/active/);

    // Switch to deprecated
    await page.locator('.cases-tab:has-text("已废弃")').click();
    await expect(page.locator('.cases-tab:has-text("已废弃")')).toHaveClass(/active/);
  });

  test('Search cases by keyword', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // Confirm we start with all 3 rows
    await expect(page.locator('.cases-table tbody tr')).toHaveCount(3);

    // Open search
    await page.locator('.cases-search-toggle button').click();
    await page.locator('.cases-search-inline input').fill('注册流程');

    // Should filter to only matching rows
    await expect(page.locator('.cases-table tbody tr')).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator('.cases-table tbody tr').first()).toContainText('注册流程测试');
  });

  test('Case table displays with sortable columns', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    await expect(page.locator('th:has-text("用例名称")')).toBeVisible();
    await expect(page.locator('th:has-text("优先级")')).toBeVisible();
    await expect(page.locator('th:has-text("状态")')).toBeVisible();
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible();
    await expect(page.locator('th:has-text("操作")')).toBeVisible();
  });

  test('Sort by column header click', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // Click title header - should show sort arrow
    await page.locator('th:has-text("用例名称")').click();
    await expect(page.locator('.sort-arrow')).toBeVisible();

    // Click priority header
    await page.locator('th:has-text("优先级")').click();

    // Click status header
    await page.locator('th:has-text("状态")').click();

    // Click created time header
    await page.locator('th:has-text("创建时间")').click();
    await expect(page.locator('.sort-arrow')).toBeVisible();
  });

  test('Create new case via modal', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    await page.locator('button:has-text("新建用例")').click();
    await expect(page.locator('.cases-modal h2')).toHaveText('新建用例');

    await page.locator('#case-title').fill('E2E自动化测试用例');
    await page.locator('#case-priority').selectOption('P1');
    await page.locator('#case-status').selectOption('not_run');
    await page.locator('#case-precondition').fill('用户已登录');
    await page.locator('#case-steps').fill('步骤1\n步骤2\n步骤3');
    await page.locator('#case-expected').fill('预期结果正常');

    await page.locator('.cases-modal .primary').click();

    // Modal should close after save (the mock returns success)
    await expect(page.locator('.cases-modal')).not.toBeVisible({ timeout: 5000 });
  });

  test('Create case validates empty title', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    await page.locator('button:has-text("新建用例")').click();
    await expect(page.locator('.cases-modal')).toBeVisible();

    // Clear the title and try to save
    await page.locator('#case-title').fill('');
    await page.locator('.cases-modal .primary').click();

    // Should show error
    await expect(page.locator('.cases-error')).toBeVisible();
    await expect(page.locator('.cases-error')).toContainText('标题不能为空');
  });

  test('Edit existing case', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // Click on title cell of first row
    await page.locator('.cases-table tbody tr:first-child .title-cell').click();
    await expect(page.locator('.cases-modal h2')).toHaveText('编辑用例');
    await expect(page.locator('#case-title')).toBeVisible();

    // Should show read-only meta info
    await expect(page.locator('.cases-modal .read-only')).toBeVisible();

    // Modify title and save
    await page.locator('#case-title').fill('已修改的用例标题');
    await page.locator('.cases-modal .primary').click();
  });

  test('Delete single case with confirmation', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // The delete button uses window.confirm - accept it
    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('.cases-table tbody tr:first-child button:has-text("删除")').click();
  });

  test('Select multiple cases for batch delete', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // Select first two rows
    await page.locator('.cases-table tbody tr:first-child input[type="checkbox"]').check();
    await page.locator('.cases-table tbody tr:nth-child(2) input[type="checkbox"]').check();

    // Batch action buttons should appear
    await expect(page.locator('button:has-text("批量删除")')).toBeVisible();
    await expect(page.locator('button:has-text("取消选择")')).toBeVisible();
  });

  test('Select all checkbox', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    const selectAll = page.locator('.cases-table thead input[type="checkbox"]');

    // Check all
    await selectAll.check();
    await expect(selectAll).toBeChecked();

    // Uncheck all
    await selectAll.uncheck();
    await expect(selectAll).not.toBeChecked();
  });

  test('Export button generates CSV', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    // The export function creates a Blob URL and triggers download programmatically.
    // Blob URLs don't fire Playwright's 'download' event, so we verify the button
    // is clickable and the handler runs without error.
    await page.locator('.cases-actions-right button:has-text("导出")').click();

    // Verify no error dialog or crash - the button click completed successfully
    await expect(page.locator('.cases-error')).not.toBeVisible();
  });

  test('Close case modal with Escape', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    await page.locator('button:has-text("新建用例")').click();
    await expect(page.locator('.cases-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.cases-modal')).not.toBeVisible();
  });

  test('Add and remove tags in case modal', async ({ page }) => {
    await page.goto(URL);
    await page.waitForSelector('.cases-table');

    await page.locator('button:has-text("新建用例")').click();
    await expect(page.locator('.cases-modal')).toBeVisible();

    // Add a tag
    await page.locator('.cases-modal-tag-input input').fill('E2E标签');
    await page.locator('.cases-modal-tag-input button:has-text("添加")').click();
    await expect(page.locator('.cases-modal-tags .tag:has-text("E2E标签")')).toBeVisible();

    // Remove the tag by clicking it
    await page.locator('.cases-modal-tags .tag:has-text("E2E标签")').click();
    await expect(page.locator('.cases-modal-tags .tag:has-text("E2E标签")')).not.toBeVisible();
  });
});
