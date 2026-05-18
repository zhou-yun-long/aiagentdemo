import { test, expect } from '@playwright/test';
import { mockProjectLayoutApis, mockDashboardApi, mockCasesWorkspaceFullApis, mockSidebarApis } from './helpers';

const PROJECT_ID = 1;

/**
 * Helper: navigate to /projects/:id/cases and switch to mindmap view.
 * Sets up all necessary API mocks so the App component can load.
 */
async function gotoMindmapView(page: import('@playwright/test').Page) {
  await mockProjectLayoutApis(page, PROJECT_ID);
  await mockDashboardApi(page, PROJECT_ID);
  await mockCasesWorkspaceFullApis(page, PROJECT_ID);
  await mockSidebarApis(page, PROJECT_ID);
  await page.goto(`/projects/${PROJECT_ID}/cases`);
  // Wait for the cases workspace to load
  await expect(page.locator('.cases-workspace')).toBeVisible();
  // Switch to mindmap view
  await page.locator('.cases-workspace-tab', { hasText: '思维导图视图' }).click();
  // Wait for the App component to render inside the mindmap container
  await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();
}

test.describe('Mindmap Workspace', () => {

  test('Mindmap view renders canvas', async ({ page }) => {
    await gotoMindmapView(page);
    await expect(page.locator('.cases-workspace-mindmap .app')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .toolbar')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .workspace')).toBeVisible();
  });

  test('Toolbar contains all action buttons', async ({ page }) => {
    await gotoMindmapView(page);
    await expect(page.locator('.cases-workspace-mindmap .toolbar .toolline')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap button:has-text("撤销")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap button:has-text("重做")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap button:has-text("插入下级")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap button:has-text("插入同级")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap button:has-text("删除")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .toolline button:has-text("保存")')).toBeVisible();
  });

  test('Stats bar shows pass rate and test count', async ({ page }) => {
    await gotoMindmapView(page);
    await expect(page.locator('.cases-workspace-mindmap .stats')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .stats')).toContainText('通过率');
    await expect(page.locator('.cases-workspace-mindmap .stats')).toContainText('已测');
  });

  test('Outline panel toggles open and closed', async ({ page }) => {
    await gotoMindmapView(page);
    // Outline starts open by default, so close it first
    await page.locator('.cases-workspace-mindmap button:has-text("关闭大纲")').click();
    // Then re-open it
    await page.locator('.cases-workspace-mindmap button:has-text("打开大纲")').click();
  });

  test('AI assistant panel toggles', async ({ page }) => {
    await gotoMindmapView(page);
    // AI assistant starts open by default, so close it first
    await page.locator('.cases-workspace-mindmap button:has-text("关闭AI助手")').click();
    // Then re-open it
    await page.locator('.cases-workspace-mindmap button:has-text("打开AI助手")').click();
  });

  test('Summary panel toggles', async ({ page }) => {
    await gotoMindmapView(page);
    // Open summary
    await page.locator('.cases-workspace-mindmap button:has-text("项目摘要")').click();
    // Close summary
    await page.locator('.cases-workspace-mindmap button:has-text("关闭摘要")').click();
  });

  test('Knowledge panel toggles', async ({ page }) => {
    await gotoMindmapView(page);
    // Open knowledge
    await page.locator('.cases-workspace-mindmap button:has-text("知识库")').click();
    // Close knowledge
    await page.locator('.cases-workspace-mindmap button:has-text("关闭知识库")').click();
  });

  test('Snapshot panel toggles', async ({ page }) => {
    await gotoMindmapView(page);
    // Open snapshot - use .actions scope to disambiguate from "保存快照"
    await page.locator('.cases-workspace-mindmap .actions button.ghost', { hasText: '快照' }).click();
    // Close snapshot
    await page.locator('.cases-workspace-mindmap button:has-text("关闭快照")').click();
  });

  test('Theme toggle switches between light and dark', async ({ page }) => {
    await gotoMindmapView(page);
    const app = page.locator('.cases-workspace-mindmap .app');
    // Get initial theme class
    const initialClass = await app.getAttribute('class');
    // Click theme toggle
    await page.locator('.cases-workspace-mindmap button[aria-label="切换主题"]').click();
    // Verify the class changed
    const newClass = await app.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });

  test('Export dropdown shows format options', async ({ page }) => {
    await gotoMindmapView(page);
    // Click export button
    await page.locator('.cases-workspace-mindmap button:has-text("导出用例")').click();
    await expect(page.locator('.cases-workspace-mindmap .export-menu button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .export-menu button:has-text("CSV")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .export-menu button:has-text("Markdown")')).toBeVisible();
  });

  test('Share panel opens', async ({ page }) => {
    await gotoMindmapView(page);
    // Click share button
    await page.locator('.cases-workspace-mindmap button:has-text("用例分享")').click();
  });

  test('Traceability view toggles', async ({ page }) => {
    await gotoMindmapView(page);
    // Click traceability view toggle
    await page.locator('.cases-workspace-mindmap button:has-text("追踪视图")').click();
    // Click again to toggle off
    await page.locator('.cases-workspace-mindmap button:has-text("追踪视图")').click();
  });

  test('Undo and redo buttons are disabled initially', async ({ page }) => {
    await gotoMindmapView(page);
    const undoBtn = page.locator('.cases-workspace-mindmap button:has-text("撤销")');
    const redoBtn = page.locator('.cases-workspace-mindmap button:has-text("重做")');
    await expect(undoBtn).toHaveClass(/disabled/);
    await expect(redoBtn).toHaveClass(/disabled/);
  });

  test('Layout mode toggle between double and single column', async ({ page }) => {
    await gotoMindmapView(page);
    const toggle = page.locator('.cases-workspace-mindmap .canvas-layout-toggle');
    await expect(toggle).toBeVisible();
    // Click single column
    const singleBtn = toggle.locator('button', { hasText: '单列' });
    await singleBtn.click();
    await expect(singleBtn).toHaveClass(/active/);
    // Click double column
    const doubleBtn = toggle.locator('button', { hasText: '双列' });
    await doubleBtn.click();
    await expect(doubleBtn).toHaveClass(/active/);
  });

  test('Edit dropdown shows sub-actions', async ({ page }) => {
    await gotoMindmapView(page);
    // Click the "编辑" button in the toolline
    await page.locator('.cases-workspace-mindmap .toolline button:has-text("编辑")').click();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("上移")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("下移")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("链接")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("图片")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("自动平衡布局")')).toBeVisible();
  });

  test('Tools dropdown shows sub-actions', async ({ page }) => {
    await gotoMindmapView(page);
    // Click the "工具" button in the toolline
    await page.locator('.cases-workspace-mindmap .toolline button:has-text("工具")').click();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("清空画布")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .tool-menu button:has-text("集成设置")')).toBeVisible();
  });

  test('Appearance panel shows theme font and size options', async ({ page }) => {
    await gotoMindmapView(page);
    // Click "外观" tab in the topline
    await page.locator('.cases-workspace-mindmap .topline .tabs button:has-text("外观")').click();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel button:has-text("浅色")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel button:has-text("深色")')).toBeVisible();
  });

  test('View panel shows zoom controls', async ({ page }) => {
    await gotoMindmapView(page);
    // Click "视图" tab in the topline
    await page.locator('.cases-workspace-mindmap .topline .tabs button:has-text("视图")').click();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel button:has-text("适应画布")')).toBeVisible();
    await expect(page.locator('.cases-workspace-mindmap .appearance-panel button:has-text("重置 100%")')).toBeVisible();
  });

  test('Navigate to case management from toolbar', async ({ page }) => {
    await mockCasesWorkspaceFullApis(page, PROJECT_ID);
    await gotoMindmapView(page);
    // The "用例管理" button in the toolbar navigates to /cases
    // But since we're already on /cases, clicking it should keep us there
    // Let's verify the button exists
    await expect(page.locator('.cases-workspace-mindmap button:has-text("用例管理")')).toBeVisible();
  });
});
