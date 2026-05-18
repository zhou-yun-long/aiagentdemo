import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis } from './helpers';

const PROJECT_ID = 1;
const URL = `/projects/${PROJECT_ID}/defects`;

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

const MOCK_DEFECTS = [
  {
    id: 1,
    projectId: PROJECT_ID,
    title: '登录页面白屏',
    description: '在 Chrome 浏览器中登录页面偶现白屏',
    severity: 'critical',
    status: 'open',
    caseId: null,
    planId: null,
    reporter: '张三',
    assignee: '李四',
    resolution: '',
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 2,
    projectId: PROJECT_ID,
    title: '搜索结果分页异常',
    description: '翻页后数据重复',
    severity: 'high',
    status: 'in_progress',
    caseId: 3,
    planId: null,
    reporter: '王五',
    assignee: '赵六',
    resolution: '',
    createdAt: '2026-05-11T10:00:00Z',
    updatedAt: '2026-05-12T14:00:00Z',
  },
  {
    id: 3,
    projectId: PROJECT_ID,
    title: '样式错位',
    description: '',
    severity: 'low',
    status: 'resolved',
    caseId: null,
    planId: 1,
    reporter: '张三',
    assignee: '',
    resolution: 'fixed',
    createdAt: '2026-05-05T08:00:00Z',
    updatedAt: '2026-05-15T16:00:00Z',
  },
];

function mockDefectsApi(
  page: import('@playwright/test').Page,
  defects = MOCK_DEFECTS,
) {
  return page.route('**/api/v1/projects/1/defects**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(defects),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          id: 99,
          projectId: PROJECT_ID,
          title: body.title,
          description: body.description || '',
          severity: body.severity || 'medium',
          status: 'open',
          caseId: null,
          planId: null,
          reporter: body.reporter || '',
          assignee: body.assignee || '',
          resolution: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });
}

function mockTransitionApi(page: import('@playwright/test').Page) {
  return page.route('**/api/v1/defects/*/transition', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          ...MOCK_DEFECTS[0],
          status: body.targetStatus,
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });
}

async function setupPage(page: import('@playwright/test').Page, defects = MOCK_DEFECTS) {
  await mockProjectLayoutApis(page, PROJECT_ID);
  await mockDefectsApi(page, defects);
  await mockTransitionApi(page);
}

test.describe('Defects Page', () => {
  test('Page loads and shows defect table', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await expect(page.locator('h1:has-text("缺陷跟踪")')).toBeVisible();
    // Table headers
    await expect(page.locator('th:has-text("ID")')).toBeVisible();
    await expect(page.locator('th:has-text("标题")')).toBeVisible();
    await expect(page.locator('th:has-text("严重程度")')).toBeVisible();
    await expect(page.locator('th:has-text("状态")')).toBeVisible();
    await expect(page.locator('th:has-text("指派人")')).toBeVisible();
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible();
    await expect(page.locator('th:has-text("操作")')).toBeVisible();
    // Data rows present
    await expect(page.locator('tbody tr')).toHaveCount(3);
  });

  test('Empty state shows no defects message', async ({ page }) => {
    await setupPage(page, []);
    await page.goto(URL);

    await expect(page.locator('text=暂无缺陷记录')).toBeVisible();
  });

  test('Status filter tabs render', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    // The status filter area should have the expected tab buttons
    await expect(page.locator('button:has-text("全部")')).toBeVisible();
    await expect(page.locator('button:has-text("Open")')).toBeVisible();
    await expect(page.locator('button:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('button:has-text("Resolved")')).toBeVisible();
    await expect(page.locator('button:has-text("Closed")')).toBeVisible();
  });

  test('Status filter tabs change active state on click', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    // Click "Open" tab — the border color changes (inline style)
    const openTab = page.locator('button:has-text("Open")');
    await openTab.click();
    // After click, the tab should have active styling (border-color: #1f6cff)
    await expect(openTab).toHaveCSS('border-color', /rgb\(31, 108, 255\)/);
  });

  test('Create defect modal opens', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await page.locator('button:has-text("新建缺陷")').click();
    await expect(page.locator('h3:has-text("新建缺陷")')).toBeVisible();
    await expect(page.locator('label:has-text("标题 *")')).toBeVisible();
    await expect(page.locator('label:has-text("描述")')).toBeVisible();
    await expect(page.locator('label:has-text("严重程度")')).toBeVisible();
    await expect(page.locator('label:has-text("指派人")')).toBeVisible();
    await expect(page.locator('label:has-text("报告人")')).toBeVisible();
  });

  test('Create defect submits form successfully', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await page.locator('button:has-text("新建缺陷")').click();
    await expect(page.locator('h3:has-text("新建缺陷")')).toBeVisible();

    // Fill required field
    await page.locator('input[placeholder="缺陷标题"]').fill('E2E 新建缺陷');
    // Fill optional fields
    await page.locator('textarea[placeholder="缺陷详细描述"]').fill('自动化测试创建');
    await page.locator('select').last().selectOption('high');
    await page.locator('input[placeholder="指派人"]').fill('测试人员');
    await page.locator('input[placeholder="报告人"]').fill('自动化');

    // Submit — the "创建" button
    await page.locator('button:has-text("创建")').click();

    // Modal should close after successful creation
    await expect(page.locator('h3:has-text("新建缺陷")')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('Create defect button disabled when title is empty', async ({
    page,
  }) => {
    await setupPage(page);
    await page.goto(URL);

    await page.locator('button:has-text("新建缺陷")').click();
    await expect(page.locator('h3:has-text("新建缺陷")')).toBeVisible();

    // Create button should be disabled when title is empty
    await expect(page.locator('button:has-text("创建")')).toBeDisabled();
  });

  test('Close create defect modal with cancel button', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await page.locator('button:has-text("新建缺陷")').click();
    await expect(page.locator('h3:has-text("新建缺陷")')).toBeVisible();

    await page.locator('button:has-text("取消")').click();
    await expect(page.locator('h3:has-text("新建缺陷")')).not.toBeVisible();
  });

  test('Severity badges are visible for each defect', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    // The severity column should contain the severity text
    await expect(
      page.locator('tbody tr:nth-child(1) td:nth-child(3) span'),
    ).toHaveText('critical');
    await expect(
      page.locator('tbody tr:nth-child(2) td:nth-child(3) span'),
    ).toHaveText('high');
    await expect(
      page.locator('tbody tr:nth-child(3) td:nth-child(3) span'),
    ).toHaveText('low');
  });

  test('Status badges render for each defect', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await expect(
      page.locator('tbody tr:nth-child(1) td:nth-child(4) span'),
    ).toHaveText('Open');
    await expect(
      page.locator('tbody tr:nth-child(2) td:nth-child(4) span'),
    ).toHaveText('In Progress');
    await expect(
      page.locator('tbody tr:nth-child(3) td:nth-child(4) span'),
    ).toHaveText('Resolved');
  });

  test('Transition button appears for open defect', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    // First row is "open" status — should show "开始处理" button
    await expect(
      page.locator(
        'tbody tr:nth-child(1) td:nth-child(7) button:has-text("开始处理")',
      ),
    ).toBeVisible();
  });

  test('Transition button appears for in_progress defect', async ({
    page,
  }) => {
    await setupPage(page);
    await page.goto(URL);

    // Second row is "in_progress" — should show "标记解决" button
    await expect(
      page.locator(
        'tbody tr:nth-child(2) td:nth-child(7) button:has-text("标记解决")',
      ),
    ).toBeVisible();
  });

  test('Transition button appears for resolved defect', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    // Third row is "resolved" — should show "关闭" button
    await expect(
      page.locator(
        'tbody tr:nth-child(3) td:nth-child(7) button:has-text("关闭")',
      ),
    ).toBeVisible();
  });

  test('Error state displays and can be dismissed', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);

    // Mock defects API to return error
    await page.route('**/api/v1/projects/1/defects**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: -1,
            message: 'Internal Server Error',
            data: null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(URL);

    // Error banner should appear
    const errorBanner = page.locator('.plans-error');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });

    // Click to dismiss
    await errorBanner.click();
    await expect(errorBanner).not.toBeVisible();
  });

  test('Back button returns to dashboard', async ({ page }) => {
    await setupPage(page);
    await page.goto(URL);

    await page.locator('.back-button:has-text("返回")').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
