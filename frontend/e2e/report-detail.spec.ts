import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis } from './helpers';

const PROJECT_ID = 1;
const REPORT_ID = 1;

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

const MOCK_REPORT_DETAIL = {
  totalCases: 20,
  passed: 17,
  failed: 2,
  blocked: 1,
  skipped: 0,
  notRun: 0,
  passRate: 0.85,
  failedCases: [
    { caseId: 3, title: '支付回调验证', priority: 'P0', errorMessage: '接口返回 500' },
    { caseId: 5, title: '订单取消流程', priority: 'P1', errorMessage: '状态未更新' },
  ],
  blockedCases: [
    { caseId: 8, title: '第三方登录集成', priority: 'P1', errorMessage: '测试环境不可用' },
  ],
  priorityDistribution: [
    { priority: 'P0', count: 5 },
    { priority: 'P1', count: 8 },
    { priority: 'P2', count: 7 },
  ],
};

const MOCK_REPORTS_LIST = [
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
];

async function mockReportDetailApi(
  page: import('@playwright/test').Page,
  reportId = REPORT_ID,
  detail = MOCK_REPORT_DETAIL
) {
  await page.route(`**/api/v1/reports/${reportId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(detail),
    });
  });
}

async function mockReportsListApi(page: import('@playwright/test').Page) {
  await page.route(`**/api/v1/projects/${PROJECT_ID}/reports`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(MOCK_REPORTS_LIST),
    });
  });
}

test.describe('Report Detail Page', () => {
  test('Report detail loads with pass rate circle', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.getByText('通过率')).toBeVisible();
    await expect(page.getByText('用例通过')).toBeVisible();
  });

  test('Status breakdown bar renders', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.getByText('执行状态分布')).toBeVisible();
    await expect(page.getByText('通过', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('失败', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('阻塞', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('跳过', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('未执行', { exact: false }).first()).toBeVisible();
  });

  test('Priority distribution section renders', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.getByText('优先级分布')).toBeVisible();
  });

  test('Failed cases table renders when present', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.getByText('失败用例')).toBeVisible();
    // Scope to the first table (failed cases) to avoid strict mode with duplicate headers
    await expect(page.locator('table.cases-table').first().locator('th:has-text("用例标题")')).toBeVisible();
    await expect(page.locator('table.cases-table').first().locator('th:has-text("优先级")')).toBeVisible();
    await expect(page.locator('table.cases-table').first().locator('th:has-text("错误信息")')).toBeVisible();
  });

  test('Blocked cases table renders when present', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.getByText('阻塞用例')).toBeVisible();
  });

  test('Export menu shows Excel and PDF options', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await page.getByRole('button', { name: '导出' }).click();
    await expect(page.getByRole('button', { name: '导出 Excel' })).toBeVisible();
    await expect(page.getByRole('button', { name: '导出 PDF' })).toBeVisible();
  });

  test('Export Excel triggers download', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    // Mock the export endpoint
    await page.route(`**/api/v1/reports/${REPORT_ID}/export**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: Buffer.from('fake-excel-data'),
      });
    });

    const downloadPromise = page.waitForEvent('download');
    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await page.getByRole('button', { name: '导出' }).click();
    await page.getByRole('button', { name: '导出 Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('Export PDF triggers download', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);

    await page.route(`**/api/v1/reports/${REPORT_ID}/export**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('fake-pdf-data'),
      });
    });

    const downloadPromise = page.waitForEvent('download');
    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await page.getByRole('button', { name: '导出' }).click();
    await page.getByRole('button', { name: '导出 PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Back button returns to reports list', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockReportDetailApi(page);
    await mockReportsListApi(page);

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await page.getByRole('button', { name: '返回列表' }).click();
    await expect(page).toHaveURL(`/projects/${PROJECT_ID}/reports`);
  });

  test('Loading state', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    // Delay the report detail API so loading state is visible
    await page.route(`**/api/v1/reports/${REPORT_ID}`, async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(MOCK_REPORT_DETAIL),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.locator('.page-status.loading')).toBeVisible();
  });

  test('Error state', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await page.route(`**/api/v1/reports/${REPORT_ID}`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: -1, message: 'Internal Server Error', data: null }),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
    await expect(page.locator('.page-status.error-banner')).toBeVisible();
  });

  test('Report not found state', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    // Return 200 with null data to trigger the "not found" UI (not error state)
    await page.route('**/api/v1/reports/99999', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(null),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/reports/99999`);
    await expect(page.getByText('报告不存在')).toBeVisible();
  });
});
