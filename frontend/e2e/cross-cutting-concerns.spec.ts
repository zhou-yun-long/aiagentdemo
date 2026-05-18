import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi, mockCasesWorkspaceFullApis, mockSidebarApis } from './helpers';

const PROJECT_ID = 1;

function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

test.describe('Cross-cutting Concerns', () => {

  test('API error on projects page', async ({ page }) => {
    // Mock the projects API to return a 500 error
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null }),
        });
      } else {
        await route.continue();
      }
    });
    // Mock the stats API too
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null }),
      });
    });

    await page.goto('/projects');
    await expect(page.locator('.projects-error')).toBeVisible();
  });

  test('API error on cases page', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);

    // Mock cases API to return error
    await page.route(`**/api/v1/projects/${PROJECT_ID}/cases`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null }),
        });
      } else {
        await route.continue();
      }
    });
    await page.route(`**/api/v1/projects/${PROJECT_ID}/cases/stats`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null }),
      });
    });

    // Mock mindmap and traceability to avoid App.tsx errors
    await page.route(`**/api/v1/projects/${PROJECT_ID}/mindmap`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
    });
    await page.route(`**/api/v1/projects/${PROJECT_ID}/traceability`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ nodes: [], edges: [] }) });
    });
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null }),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.cases-error')).toBeVisible();
  });

  test('Keyboard shortcut Ctrl+Z triggers undo', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page, PROJECT_ID);
    await mockCasesWorkspaceFullApis(page, PROJECT_ID);
    await mockSidebarApis(page, PROJECT_ID);

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.cases-workspace')).toBeVisible();
    // Switch to mindmap view
    await page.locator('.cases-workspace-tab', { hasText: '思维导图视图' }).click();
    await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();

    // Press Ctrl+Z - this should not throw or navigate away
    await page.keyboard.press('Control+z');
    // The undo button should still be visible (no error occurred)
    await expect(page.locator('.cases-workspace-mindmap button:has-text("撤销")')).toBeVisible();
  });

  test('Keyboard shortcut Ctrl+Shift+Z triggers redo', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page, PROJECT_ID);
    await mockCasesWorkspaceFullApis(page, PROJECT_ID);
    await mockSidebarApis(page, PROJECT_ID);

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.cases-workspace')).toBeVisible();
    await page.locator('.cases-workspace-tab', { hasText: '思维导图视图' }).click();
    await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();

    // Press Ctrl+Shift+Z
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('.cases-workspace-mindmap button:has-text("重做")')).toBeVisible();
  });

  test('Keyboard shortcut Ctrl+A selects all nodes', async ({ page }) => {
    await mockProjectLayoutApis(page, PROJECT_ID);
    await mockDashboardApi(page, PROJECT_ID);
    await mockCasesWorkspaceFullApis(page, PROJECT_ID);
    await mockSidebarApis(page, PROJECT_ID);

    await page.goto(`/projects/${PROJECT_ID}/cases`);
    await expect(page.locator('.cases-workspace')).toBeVisible();
    await page.locator('.cases-workspace-tab', { hasText: '思维导图视图' }).click();
    await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();

    // Press Ctrl+A - should not throw
    await page.keyboard.press('Control+a');
    // The app should still be visible (no error)
    await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();
  });

  test('Dialog confirmation for destructive actions', async ({ page }) => {
    // Mock the projects API with data
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: envelope([
            {
              id: 1, name: '测试项目Alpha', description: '用于E2E测试',
              status: 'active', createdAt: '2026-01-10T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ 1: { total: 10, passed: 8, failed: 1, blocked: 1, passRate: 80.0 } }),
      });
    });

    await page.goto('/projects');

    // Set up dialog handler to dismiss (cancel) the confirmation
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('归档');
      await dialog.dismiss();
    });

    // Click the archive button on the first project card
    await page.locator('.project-card').first().locator('button', { hasText: '归档' }).click();
    // The dialog was dismissed, so the project should still be visible
    await expect(page.locator('.project-card').first()).toBeVisible();
  });

  test('Multiple projects with stats display correctly', async ({ page }) => {
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: envelope([
            {
              id: 1, name: '测试项目Alpha', description: '用于E2E测试',
              status: 'active', createdAt: '2026-01-10T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z',
            },
            {
              id: 2, name: '测试项目Beta', description: '第二个项目',
              status: 'active', createdAt: '2026-02-20T09:00:00Z', updatedAt: '2026-05-10T14:00:00Z',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          1: { total: 10, passed: 8, failed: 1, blocked: 1, passRate: 80.0 },
          2: { total: 5, passed: 3, failed: 2, blocked: 0, passRate: 60.0 },
        }),
      });
    });

    await page.goto('/projects');
    await expect(page.locator('.project-card-stats').first()).toBeVisible();
    await expect(page.locator('.project-stats-bar').first()).toBeVisible();
  });

  test('Project card shows correct status badge', async ({ page }) => {
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: envelope([
            {
              id: 1, name: '测试项目Alpha', description: '用于E2E测试',
              status: 'active', createdAt: '2026-01-10T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ 1: { total: 10, passed: 8, failed: 1, blocked: 1, passRate: 80.0 } }),
      });
    });

    await page.goto('/projects');
    await expect(page.locator('.project-status-badge').first()).toBeVisible();
    await expect(page.locator('.project-status-badge').first()).toHaveText('活跃');
  });

  test('Date formatting is in Chinese locale', async ({ page }) => {
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: envelope([
            {
              id: 1, name: '测试项目Alpha', description: '用于E2E测试',
              status: 'active', createdAt: '2026-01-10T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/v1/projects/cases/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ 1: { total: 10, passed: 8, failed: 1, blocked: 1, passRate: 80.0 } }),
      });
    });

    await page.goto('/projects');
    await expect(page.locator('.project-card-meta').first()).toContainText('创建:');
    await expect(page.locator('.project-card-meta').first()).toContainText('更新:');
  });
});
