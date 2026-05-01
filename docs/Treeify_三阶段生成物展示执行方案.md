# Treeify 三阶段生成物展示执行方案

> 创建时间：2026-05-01
> 当前分支：`codex/stage-artifacts-execution-doc`
> 目标：在现有三阶段生成链路上展示阶段生成物，支持用户补充，并可选择是否同步显示到画布。

---

## 1. 背景与目标

当前生成链路已有 E1、E2、E3、Critic 的阶段进度与流式输出，但用户需要看到更结构化的阶段生成物：

- E1：需求分析结果
- E2：拆解对象结果，并合并用户补充
- E3：测试用例生成结果

本次迭代目标是在不破坏现有 SSE 流式生成、逐步确认、用例导入和画布编辑能力的基础上，新增“阶段生成物”展示与画布显隐能力。

---

## 2. 用户流程

### 2.1 Auto 模式

1. 用户输入需求并启动生成。
2. 系统按 E1 -> E2 -> E3 -> Critic 自动执行。
3. 右侧生成面板持续显示当前阶段输出。
4. 每个阶段完成后，在“阶段生成物”区域沉淀结构化结果。
5. 用户可展开查看 E1、E2、E3 的结果，并补充自己的说明。
6. 用户可打开或关闭“显示到画布”开关。

### 2.2 Step 模式

1. E1 完成后展示“需求分析结果”。
2. 用户可在 E1 补充区输入修正、约束或遗漏点。
3. 点击“继续下一阶段”时，将用户补充一并提交给后端。
4. E2 完成后展示“拆解对象结果 + 用户补充”。
5. 用户可继续补充拆解对象，确认后进入 E3。
6. E3 完成后展示最终用例结果，并可导入工作台。

---

## 3. 展示内容定义

| 阶段 | 展示标题 | 主要内容 | 用户补充 | 是否可上画布 |
| --- | --- | --- | --- | --- |
| E1 | 需求分析 | 业务目标、流程边界、规则约束、异常条件 | 是 | 是 |
| E2 | 拆解对象 | 功能点、场景、路径、边界、数据对象 | 是 | 是 |
| E3 | 用例结果 | 候选测试用例、优先级、路径类型、标签 | 可选 | 是 |
| Critic | 质量检查 | 评分、风险、缺口建议 | 否 | 否 |

说明：
- “用户补充”与 AI 结果分开展示，避免用户内容被误认为 AI 原始输出。
- E2 展示时应能看到 E1 的用户补充是否已被带入下一阶段。
- 画布展示是视图层开关，不应删除或覆盖真实生成结果。

---

## 4. 数据结构建议

### 4.1 前端状态

在 `frontend/src/types/generation.ts` 中扩展阶段视图状态：

```ts
export type StageArtifact = {
  stage: GenerateStage;
  title: string;
  aiResult: string;
  userSupplement: string;
  visibleOnCanvas: boolean;
  updatedAt?: string;
};
```

在 `StageViewState` 中新增：

```ts
artifact?: StageArtifact;
```

或者在 `generationStore` 中单独维护：

```ts
artifacts: Partial<Record<GenerateStage, StageArtifact>>;
setArtifactSupplement(stage, value);
toggleArtifactCanvasVisible(stage);
```

推荐使用独立 `artifacts`，这样不需要把流式内容、阶段状态和可编辑生成物混在一起。

### 4.2 SSE Payload

当前 `stage_done` 已有 `result`，可先兼容字符串结果：

```json
{
  "result": "需求边界已收敛为...",
  "needConfirm": true
}
```

后续可演进为结构化对象：

```json
{
  "result": {
    "summary": "需求边界已收敛为...",
    "items": ["登录主流程", "输入校验", "失败锁定"],
    "risks": ["锁定恢复时间未明确"]
  },
  "needConfirm": true
}
```

前端需要同时兼容字符串和对象，避免后端逐步升级时前端崩溃。

### 4.3 后端任务上下文

`ConfirmGenerateTaskRequest.feedback` 继续作为用户阶段补充入口。

后端在继续下一阶段时需要把历史阶段结果与用户补充放入 `StageContext`：

- `previousStageResults`
- `stageFeedback`
- `selectedNodeId`
- `contextCaseIds`
- `attachments`

---

## 5. 前端实现拆解

### 5.1 新增阶段生成物组件

新增文件：

| 文件 | 作用 |
| --- | --- |
| `frontend/src/components/StageArtifactsPanel.tsx` | 展示 E1/E2/E3/Critic 生成物、补充输入、画布显隐开关 |

核心能力：

- 按阶段折叠/展开。
- 展示 AI 阶段结果。
- 支持 E1/E2 用户补充编辑。
- E3 展示用例摘要，可跳转到现有 `CasePreviewTable`。
- 提供“显示到画布”开关。

### 5.2 接入 GeneratePanel

改动文件：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/GeneratePanel.tsx` | 在流式输出下方接入 `StageArtifactsPanel` |
| `frontend/src/features/generation/generationStore.ts` | 新增 artifacts 状态与更新方法 |
| `frontend/src/features/generation/useGenerateStream.ts` | 在 `stage_done` 和 mock 流程中写入 artifact |

交互规则：

- `stage_done` 后将 `result` 写入对应阶段 artifact。
- 逐步模式下，当前阶段 `waiting_confirm` 时允许编辑补充。
- 点击“继续下一阶段”时，把当前阶段补充作为 `feedback` 传给 `confirmCurrentStage`。

### 5.3 画布显示/隐藏

改动文件：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/App.tsx` | 将可见 artifact 转为画布辅助节点 |
| `frontend/src/components/MindMapCanvas.tsx` | 接收辅助节点或复用 `nodes` 渲染 |
| `frontend/src/shared/types/workspace.ts` | 如需要，扩展 `MindNode.kind` |

推荐方案：

1. 不直接持久化 artifact 画布节点。
2. 在前端渲染层把 `visibleOnCanvas=true` 的 artifact 映射为临时节点。
3. 临时节点使用稳定 id，例如 `artifact-e1`、`artifact-e2`、`artifact-e3`。
4. 用户关闭“显示到画布”后，临时节点从画布消失，但 artifact 内容保留。

节点类型建议：

```ts
kind: 'artifact'
```

节点标题：

- `需求分析结果`
- `拆解对象结果`
- `用例生成结果`

节点正文：

- AI 结果摘要
- 用户补充摘要

---

## 6. 后端实现拆解

### 6.1 短期方案

无需新增数据库表，先利用现有 SSE `stage_done.result` 与 `ConfirmGenerateTaskRequest.feedback` 完成闭环：

- E1/E2 阶段完成时返回可读结果。
- 用户补充通过 confirm 请求进入下一阶段。
- E2/E3 Agent prompt 中明确读取上一阶段用户补充。

### 6.2 中期方案

如需要刷新后保留阶段生成物，可在 `TreeifyGenerationTask` 中新增 JSON 字段：

```java
@Convert(converter = JsonMapConverter.class)
private Map<String, Object> stageArtifacts;
```

保存内容：

- `stage`
- `aiResult`
- `userSupplement`
- `visibleOnCanvas`
- `updatedAt`

短期不建议立刻落库，除非产品明确要求“刷新后仍保留阶段生成物和显隐状态”。

---

## 7. 验收标准

1. 启动生成后，E1 完成时能看到“需求分析结果”。
2. Step 模式下，用户能在 E1 结果下补充内容，并继续进入 E2。
3. E2 完成时能看到“拆解对象结果”和上一阶段用户补充。
4. E2 用户补充能在继续 E3 时传给后端。
5. E3 完成后能看到用例生成结果，并保留现有导入能力。
6. 每个可展示阶段都有“显示到画布”开关。
7. 打开开关后，画布出现对应阶段生成物节点。
8. 关闭开关后，画布隐藏对应节点，但右侧生成物内容不丢失。
9. Auto 模式下无需用户确认也能沉淀三个阶段生成物。
10. Mock 与真实后端链路均可运行。

---

## 8. 推荐实施顺序

1. 扩展 `generationStore`，新增 `artifacts` 状态。
2. 在 `useGenerateStream` 的 mock 和真实 SSE `stage_done` 中写入 artifact。
3. 新增 `StageArtifactsPanel`，先完成右侧展示和用户补充。
4. 调整 `GeneratePanel`，让“继续下一阶段”读取当前 artifact 的用户补充。
5. 实现 artifact 到画布临时节点的映射。
6. 补充样式，确保生成面板、开关、画布节点在小屏不重叠。
7. 做 mock 链路验收，再做真实后端 SSE 验收。

---

## 9. 风险与注意事项

- 不要把画布隐藏等同于删除生成物。
- 不要让用户补充覆盖 AI 原始结果，应分栏或分段展示。
- `stage_done.result` 需要兼容字符串与对象两种格式。
- Step 模式确认时要提交当前阶段补充，不要只读取旧的 `feedback` 文本框。
- 临时 artifact 节点不应参与用例保存、批量确认或执行状态统计。
- 如果后续要落库，需要明确 artifact 是否属于项目快照的一部分。

---

## 10. 测试建议

### 前端

```bash
cd frontend
npm run build
```

重点手测：

- `VITE_TREEIFY_API_MODE=mock` 下 auto/step 两种模式。
- 打开/关闭画布展示开关。
- E1/E2 补充内容为空和非空两种情况。
- E3 用例导入流程不受影响。

### 后端

```bash
./mvnw test
```

重点验证：

- `ConfirmGenerateTaskRequest.feedback` 正确进入后续阶段上下文。
- SSE `stage_done` payload 保持向后兼容。
- 真实 AI 异常时仍能降级 mock。
