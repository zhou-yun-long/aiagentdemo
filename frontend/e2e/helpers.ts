import type { Page } from '@playwright/test';

/**
 * Standard API envelope wrapper matching the backend format.
 */
function envelope<T>(data: T) {
  return JSON.stringify({ code: 0, message: 'ok', data });
}

/**
 * Mock the common APIs that the ProjectLayout shell (sidebar + topbar)
 * and App.tsx call on every project-scoped page load.
 */
export async function mockProjectLayoutApis(page: Page, projectId = 1) {
  // Projects list (used by sidebar + topbar)
  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope([
          {
            id: projectId,
            name: '测试项目A',
            description: 'E2E 测试用项目',
            status: 'active',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-05-18T10:00:00Z',
          },
          {
            id: 2,
            name: '测试项目B',
            description: '另一个项目',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            updatedAt: '2026-05-17T08:00:00Z',
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Single project detail
  await page.route(`**/api/v1/projects/${projectId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          id: projectId,
          name: '测试项目A',
          description: 'E2E 测试用项目',
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-05-18T10:00:00Z',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Project stats
  await page.route('**/api/v1/projects/cases/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        [projectId]: { total: 10, passed: 8, failed: 1, blocked: 1, passRate: 80.0 },
      }),
    });
  });

  // Mindmap data
  await page.route(`**/api/v1/projects/${projectId}/mindmap`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([
        { id: 'root', parentId: null, title: '测试项目A', kind: 'root', lane: 'center', depth: 0, order: 0 },
      ]),
    });
  });

  // Traceability
  await page.route(`**/api/v1/projects/${projectId}/traceability`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ nodes: [], edges: [], updatedAt: new Date().toISOString() }),
    });
  });
}

/**
 * Mock the dashboard API with standard data.
 */
export async function mockDashboardApi(page: Page, projectId = 1) {
  await page.route(`**/api/v1/projects/${projectId}/dashboard`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        totalCases: 42,
        coveredCases: 40,
        passedCases: 35,
        failedCases: 5,
        blockedCases: 2,
        passRate: 83.3,
        recentActivity: [
          { type: 'generation', description: '新建用例: 登录功能验证', timestamp: '2026-05-18T10:00:00Z' },
          { type: 'case_passed', description: '用例通过: 注册流程测试', timestamp: '2026-05-17T15:30:00Z' },
          { type: 'plan_created', description: '创建计划: 回归测试计划', timestamp: '2026-05-16T09:00:00Z' },
        ],
      }),
    });
  });
}

/**
 * Mock the cases API with sample test cases.
 */
export async function mockCasesApi(page: Page, projectId = 1) {
  const cases = [
    {
      id: 1, projectId, title: '登录功能验证', priority: 'P0',
      precondition: '用户已注册', steps: ['打开登录页', '输入用户名密码', '点击登录'],
      expected: '登录成功跳转首页', executionStatus: 'pass',
      tags: ['冒烟'], source: 'manual', version: 1,
      createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-10T10:00:00Z',
    },
    {
      id: 2, projectId, title: '注册流程测试', priority: 'P1',
      precondition: '', steps: ['打开注册页', '填写信息', '提交'],
      expected: '注册成功', executionStatus: 'not_run',
      tags: [], source: 'manual', version: 1,
      createdAt: '2026-05-02T08:00:00Z', updatedAt: '2026-05-02T08:00:00Z',
    },
    {
      id: 3, projectId, title: '搜索功能测试', priority: 'P2',
      precondition: '用户已登录', steps: ['打开搜索', '输入关键词', '点击搜索'],
      expected: '显示搜索结果', executionStatus: 'fail',
      tags: ['已废弃'], source: 'ai', version: 1,
      createdAt: '2026-05-03T08:00:00Z', updatedAt: '2026-05-03T08:00:00Z',
    },
  ];

  const stats = { total: 3, pass: 1, fail: 1, notRun: 1, blocked: 0, skipped: 0 };

  await page.route(`**/api/v1/projects/${projectId}/cases`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(cases),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ id: 99, ...body, projectId, source: 'manual', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`**/api/v1/projects/${projectId}/cases/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(stats),
    });
  });

  await page.route('**/api/v1/cases/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ deleted: true, caseId: 1 }),
      });
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(cases[0]),
      });
    } else {
      await route.continue();
    }
  });

  return { cases, stats };
}

/**
 * Mock the plans API with sample test plans.
 */
export async function mockPlansApi(page: Page, projectId = 1) {
  const plans = [
    {
      id: 1, projectId, name: '回归测试计划', description: 'V2.0 版本回归测试',
      status: 'active', startDate: '2026-05-01', endDate: '2026-05-30',
      createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z',
      caseCount: 10, passedCount: 7,
    },
    {
      id: 2, projectId, name: '冒烟测试计划', description: '核心流程冒烟验证',
      status: 'done', startDate: '2026-04-15', endDate: '2026-04-20',
      createdAt: '2026-04-15T08:00:00Z', updatedAt: '2026-04-20T18:00:00Z',
      caseCount: 5, passedCount: 5,
    },
  ];

  const planDetail = {
    plan: plans[0],
    cases: [
      {
        id: 1, planId: 1, caseId: 1, caseTitle: '登录功能验证',
        assigneeId: null, executionResult: 'pass', note: null,
        createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-10T10:00:00Z',
      },
      {
        id: 2, planId: 1, caseId: 2, caseTitle: '注册流程测试',
        assigneeId: null, executionResult: 'fail', note: '验证码接口超时',
        createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-12T14:00:00Z',
      },
    ],
  };

  await page.route(`**/api/v1/projects/${projectId}/plans`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(plans),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/plans', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ id: 99, name: '新计划', projectId, status: 'draft', description: '', caseCount: 0, passedCount: 0, startDate: null, endDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/plans/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(planDetail),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(null),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/plans/*/cases/*/result', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ id: 1, caseId: 1, executionResult: 'pass', note: '', planId: 1, caseTitle: '登录功能验证', assigneeId: null, createdAt: '', updatedAt: '' }),
    });
  });

  await page.route('**/api/v1/plans/*/recompute', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(plans[0]),
    });
  });

  // Delete any plan by id (catch-all for non-1 plans).
  // This must be registered BEFORE the specific /plans/1 route because
  // Playwright routes are last-added-wins, and we want /plans/1 to use
  // the specific handler above for GET requests.
  // Note: we handle this by keeping the catch-all but making it check
  // the URL to avoid overriding the specific handler.

  return { plans, planDetail };
}

/**
 * Mock the CasesWorkspacePage + App.tsx (mindmap) APIs.
 * Navigating to /projects/:id/cases and switching to mindmap view
 * triggers both CasesWorkspacePage APIs and App.tsx useProjectLoader APIs.
 */
export async function mockCasesWorkspaceFullApis(page: Page, projectId = 1) {
  // CasesWorkspacePage loads cases list
  await page.route(`**/api/v1/projects/${projectId}/cases`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope([
          {
            id: 1, title: '登录功能验证', priority: 'P0',
            precondition: '用户已注册', steps: ['打开登录页', '输入用户名密码', '点击登录'],
            expected: '登录成功', executionStatus: 'pass',
            tags: ['冒烟'], source: 'manual', version: 1,
            createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-10T10:00:00Z',
          },
          {
            id: 2, title: '注册流程测试', priority: 'P1',
            precondition: '', steps: ['打开注册页', '填写信息', '提交'],
            expected: '注册成功', executionStatus: 'not_run',
            tags: [], source: 'manual', version: 1,
            createdAt: '2026-05-02T08:00:00Z', updatedAt: '2026-05-02T08:00:00Z',
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // CasesWorkspacePage + App.tsx stats
  await page.route(`**/api/v1/projects/${projectId}/cases/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ total: 2, passed: 1, failed: 0, blocked: 0, passRate: 50.0, notRun: 1, skipped: 0 }),
    });
  });

  // All projects stats (used by project list store)
  await page.route('**/api/v1/projects/cases/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ [projectId]: { total: 2, passed: 1, failed: 0, blocked: 0, passRate: 50.0, notRun: 1, skipped: 0 } }),
    });
  });

  // App.tsx useProjectLoader - mindmap data
  await page.route(`**/api/v1/projects/${projectId}/mindmap`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([
        { id: 'root', parentId: null, title: '测试项目A', kind: 'root', lane: 'center', depth: 0, order: 0 },
        { id: 'case-1', parentId: 'root', caseId: '1', title: '登录功能验证', kind: 'case', priority: 'P0', tags: ['冒烟'], status: 'active', executionStatus: 'pass', source: 'manual', version: 1, lane: 'middle', depth: 1, order: 0 },
      ]),
    });
  });

  // App.tsx useProjectLoader - traceability
  await page.route(`**/api/v1/projects/${projectId}/traceability`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ nodes: [], edges: [], updatedAt: new Date().toISOString() }),
    });
  });

  // Manage APIs (MCP, model params) - used by integration panel
  await page.route('**/api/manage/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
}

/**
 * Mock other sidebar-dependent APIs (summary, knowledge, snapshots, share, etc.)
 */
export async function mockSidebarApis(page: Page, projectId = 1) {
  await page.route(`**/api/v1/projects/${projectId}/summary`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(null) });
  });
  await page.route(`**/api/v1/projects/${projectId}/summary/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await page.route(`**/api/v1/projects/${projectId}/knowledge`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await page.route(`**/api/v1/projects/${projectId}/snapshots`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await page.route(`**/api/v1/projects/${projectId}/share`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(null) });
  });
  await page.route(`**/api/manage/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({}) });
  });
}
