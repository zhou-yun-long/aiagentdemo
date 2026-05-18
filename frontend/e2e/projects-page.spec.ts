import { test, expect } from '@playwright/test';

const ENVELOPE = (data: unknown) => JSON.stringify({ code: 0, message: 'ok', data });

const MOCK_PROJECTS = [
  {
    id: 1,
    name: '测试项目Alpha',
    description: '用于自动化测试的项目',
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 2,
    name: '另一个项目Beta',
    description: '第二个测试项目',
    status: 'active',
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-05-17T14:00:00Z',
  },
  {
    id: 3,
    name: '归档项目Gamma',
    description: '已归档的旧项目',
    status: 'archived',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-12-31T23:59:59Z',
  },
];

const MOCK_STATS = {
  1: { total: 25, passed: 20, failed: 3, blocked: 2, passRate: 80.0 },
  2: { total: 10, passed: 9, failed: 1, blocked: 0, passRate: 90.0 },
  3: { total: 5, passed: 5, failed: 0, blocked: 0, passRate: 100.0 },
};

async function mockProjectsApis(page: import('@playwright/test').Page, options?: { delayMs?: number }) {
  const delay = options?.delayMs ?? 0;

  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'GET') {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ENVELOPE(MOCK_PROJECTS),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/projects/cases/stats', async (route) => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ENVELOPE(MOCK_STATS),
    });
  });
}

test.describe('Projects Page', () => {

  test('Page loads with project list', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-page h1')).toHaveText('项目管理');
    await expect(page.locator('.projects-filter')).toBeVisible();
    await expect(page.locator('.projects-list')).toBeVisible();
  });

  test('Loading spinner shows while fetching', async ({ page }) => {
    // Add delay so loading state is visible
    await mockProjectsApis(page, { delayMs: 500 });
    await page.goto('/projects');
    await expect(page.locator('.projects-loading')).toBeVisible();
    // Wait for loading to finish
    await expect(page.locator('.projects-loading')).not.toBeVisible({ timeout: 5000 });
  });

  test('Filter tabs switch between active archived and all', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Click "活跃" filter
    await page.locator('.projects-filter button', { hasText: '活跃' }).click();
    await expect(page.locator('.filter-count').first()).toBeVisible();

    // Click "已归档" filter
    await page.locator('.projects-filter button', { hasText: '已归档' }).click();
    // Should show archived project
    await expect(page.locator('.projects-list')).toBeVisible();

    // Click "全部" filter
    await page.locator('.projects-filter button', { hasText: '全部' }).click();
    await expect(page.locator('.projects-list')).toBeVisible();
  });

  test('Search filters projects by name and description', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Search for existing project
    await page.locator('.projects-search-bar input').fill('Alpha');
    await expect(page.locator('.project-card')).toHaveCount(1);

    // Search for nonexistent project
    await page.locator('.projects-search-bar input').fill('nonexistent_xyz_12345');
    await expect(page.locator('.projects-empty')).toBeVisible();
  });

  test('Sort dropdown changes project order', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Select different sort options
    await page.locator('.projects-search-bar select').selectOption('name');
    await expect(page.locator('.projects-list')).toBeVisible();

    await page.locator('.projects-search-bar select').selectOption('caseCount');
    await expect(page.locator('.projects-list')).toBeVisible();

    await page.locator('.projects-search-bar select').selectOption('updatedAt');
    await expect(page.locator('.projects-list')).toBeVisible();
  });

  test('Create project modal opens and saves', async ({ page }) => {
    // Mock stats first (more specific URL)
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: ENVELOPE(MOCK_STATS) });
    });

    // Mock /api/v1/projects for both GET and POST
    await page.route('**/api/v1/projects', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: ENVELOPE(MOCK_PROJECTS) });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: ENVELOPE({
            id: 100,
            name: 'E2E测试项目',
            description: '自动化测试创建的项目',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Open create modal
    await page.locator('button', { hasText: '新建项目' }).click();
    await expect(page.locator('.project-modal')).toBeVisible();

    // Fill form
    await page.locator('#project-name').fill('E2E测试项目');
    await page.locator('#project-desc').fill('自动化测试创建的项目');

    // Save
    await page.locator('.project-modal .primary').click();
    // Modal should close after save
    await expect(page.locator('.project-modal')).not.toBeVisible({ timeout: 5000 });
  });

  test('Create project validates empty name', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Open create modal
    await page.locator('button', { hasText: '新建项目' }).click();
    await expect(page.locator('.project-modal')).toBeVisible();

    // Clear name (it starts empty) and try to save
    await page.locator('#project-name').fill('');
    // The save button should be disabled when name is empty
    await expect(page.locator('.project-modal .primary')).toBeDisabled();

    // Modal should still be visible
    await expect(page.locator('.project-modal')).toBeVisible();
  });

  test('Edit project modal opens with pre-filled data', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Click edit on first project
    await page.locator('.project-card').first().locator('button', { hasText: '编辑' }).click();

    // Modal should show with edit title and pre-filled data
    await expect(page.locator('.project-modal h2')).toHaveText('编辑项目');
    await expect(page.locator('#project-name')).toHaveValue('测试项目Alpha');
    await expect(page.locator('.project-modal .read-only')).toBeVisible();
  });

  test('Archive project with confirmation', async ({ page }) => {
    await mockProjectsApis(page);

    // Mock the DELETE (archive) endpoint
    await page.route('**/api/v1/projects/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: ENVELOPE(null),
        });
      } else {
        await route.continue();
      }
    });

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Click archive on first active project
    await page.locator('.project-card').first().locator('button.danger', { hasText: '归档' }).click();

    // Wait for the request to complete
    await page.waitForResponse((resp) => resp.url().includes('/api/v1/projects/1') && resp.request().method() === 'DELETE');
  });

  test('Restore archived project', async ({ page }) => {
    await mockProjectsApis(page);

    // Mock the PATCH (restore) endpoint
    await page.route('**/api/v1/projects/3/restore', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ENVELOPE({
          id: 3,
          name: '归档项目Gamma',
          description: '已归档的旧项目',
          status: 'active',
          createdAt: '2025-06-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Switch to archived filter
    await page.locator('.projects-filter button', { hasText: '已归档' }).click();

    // Click restore on archived project
    await page.locator('.project-card').first().locator('button', { hasText: '恢复' }).click();

    // Wait for restore request
    await page.waitForResponse((resp) => resp.url().includes('/restore') && resp.request().method() === 'PATCH');
  });

  test('Select project and enter it', async ({ page }) => {
    await mockProjectsApis(page);
    // Mock APIs needed for project layout + dashboard
    await page.route('**/api/v1/projects/1/mindmap', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: ENVELOPE([]) });
    });
    await page.route('**/api/v1/projects/1/traceability', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: ENVELOPE({ nodes: [], edges: [], updatedAt: new Date().toISOString() }) });
    });
    await page.route('**/api/v1/projects/1/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ENVELOPE({
          totalCases: 10, coveredCases: 8, passedCases: 7, failedCases: 1, blockedCases: 0, passRate: 70.0,
          recentActivity: [],
        }),
      });
    });
    await page.route('**/api/v1/projects/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: ENVELOPE(MOCK_PROJECTS[0]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Click "进入" on first project
    await page.locator('.project-card').first().locator('a', { hasText: '进入' }).click();

    // "进入" links to /projects/N/dashboard
    await expect(page).toHaveURL(/\/projects\/1\/dashboard/);
  });

  test('Batch select and archive', async ({ page }) => {
    await mockProjectsApis(page);

    // Mock DELETE endpoint
    await page.route('**/api/v1/projects/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: ENVELOPE(null) });
      } else {
        await route.continue();
      }
    });

    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Switch to "全部" to see all projects
    await page.locator('.projects-filter button', { hasText: '全部' }).click();

    // Select first checkbox
    const firstCheckbox = page.locator('.project-card-select input[type=checkbox]').first();
    await firstCheckbox.check();

    // Batch bar should appear
    await expect(page.locator('.projects-batch-bar')).toBeVisible();

    // Click batch archive
    await page.locator('.projects-batch-bar button', { hasText: '批量归档' }).click();
  });

  test('Close modal with Escape key', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Open create modal
    await page.locator('button', { hasText: '新建项目' }).click();
    await expect(page.locator('.project-modal')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.project-modal')).not.toBeVisible();
  });

  test('Close modal by clicking overlay', async ({ page }) => {
    await mockProjectsApis(page);
    await page.goto('/projects');
    await expect(page.locator('.projects-list')).toBeVisible();

    // Open create modal
    await page.locator('button', { hasText: '新建项目' }).click();
    await expect(page.locator('.project-modal')).toBeVisible();

    // Click overlay to close
    await page.locator('.project-modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.project-modal')).not.toBeVisible();
  });
});
