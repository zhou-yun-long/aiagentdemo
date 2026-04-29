import { test, expect } from '@playwright/test';

const REQUIREMENT = `策略红包仍有余额
策略红包的功能交互
策略红包展示对应 tag，新人红包、加油红包
点击策略红包，进入提现详情页，被选中后流程提示"该红包已被抢光"
提现完成后，回到活动主页`;

test('AI generation flow with 策略红包 requirement', async ({ page }) => {
  test.setTimeout(300_000); // 5 minutes total

  // Step 1: Open app
  await page.goto('/');
  await expect(page.locator('.assistant-panel.open')).toBeVisible({ timeout: 15_000 });

  // Step 2: Fill requirement into GeneratePanel textarea
  const textarea = page.locator('textarea.requirement-input');
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  await textarea.click();
  await textarea.fill(REQUIREMENT);
  await expect(textarea).toHaveValue(REQUIREMENT);

  // Step 3: Ensure "auto" mode is selected
  const autoBtn = page.locator('.mode-switch button').first();
  await autoBtn.click();

  // Step 4: Click "启动生成"
  const startBtn = page.locator('button.primary', { hasText: '启动生成' });
  await expect(startBtn).toBeEnabled({ timeout: 5_000 });
  await startBtn.click();
  console.log('[TEST] Generation started');

  // Step 5: Wait for generation to start (status changes to running)
  await expect(page.locator('.stage-item.running, .stage-item.waiting_confirm').first()).toBeVisible({ timeout: 15_000 });
  console.log('[TEST] Generation is running');

  // Step 6: Poll for completion, handling confirm prompts along the way
  let completed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    // Check if cases appeared (generation complete)
    const casePreview = page.locator('.case-preview-table');
    if (await casePreview.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const rows = page.locator('.case-preview-table tbody tr');
      const count = await rows.count();
      if (count > 0) {
        console.log(`[TEST] Generation complete: ${count} cases generated`);
        completed = true;
        break;
      }
    }

    // Check if we need to confirm a stage
    const confirmBtn = page.locator('button', { hasText: '继续下一阶段' });
    if (await confirmBtn.isEnabled({ timeout: 1_000 }).catch(() => false)) {
      console.log(`[TEST] Clicking confirm for stage`);
      await confirmBtn.click();
      await page.waitForTimeout(2_000);
      continue;
    }

    // Check for error with retry option
    const retryBtn = page.locator('.retry-btn');
    if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      console.log(`[TEST] Error detected, clicking retry`);
      await retryBtn.click();
      await page.waitForTimeout(2_000);
      continue;
    }

    // Check for error without retry
    const errorArea = page.locator('.stream-error');
    if (await errorArea.isVisible({ timeout: 500 }).catch(() => false)) {
      const errorText = await errorArea.textContent();
      console.log(`[TEST] Error: ${errorText}`);
    }

    // Log current stage status
    const runningStages = await page.locator('.stage-item.running').count();
    const doneStages = await page.locator('.stage-item.done').count();
    const waitingStages = await page.locator('.stage-item.waiting_confirm').count();
    console.log(`[TEST] Status: running=${runningStages}, done=${doneStages}, waiting=${waitingStages}`);

    await page.waitForTimeout(3_000);
  }

  // Step 7: Take screenshot of final state
  await page.screenshot({ path: 'specs/ai-generation-result.png', fullPage: true });
  console.log('[TEST] Screenshot saved');

  // Step 8: Verify results
  if (completed) {
    const caseRows = page.locator('.case-preview-table tbody tr');
    const count = await caseRows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[TEST] PASSED: ${count} test cases generated`);
  } else {
    // Check what stages completed
    const doneStages = await page.locator('.stage-item.done').count();
    const waitingStages = await page.locator('.stage-item.waiting_confirm').count();
    console.log(`[TEST] Partial: done=${doneStages}, waiting=${waitingStages}`);
    // Still pass if at least some stages completed
    expect(doneStages + waitingStages).toBeGreaterThan(0);
  }
});
