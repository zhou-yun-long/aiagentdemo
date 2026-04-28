# Treeify P1 任务拆解

> 基于 P0 MVP 已完成的主链路，评估并拆解下一轮 P1 开发任务。
> 更新时间：2026-04-29
> 当前分支：`codex/backend-contracts`

---

## 1. 当前状态判断

### 1.1 P0 MVP 已完成

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| 后端 mock API 全套 | 已完成 | 项目、用例、统计、脑图、生成任务、确认、取消、SSE |
| 后端统一响应与错误码 | 已完成 | `ApiResponse` + `ApiErrorCode` + `GlobalExceptionHandler` |
| 后端 JPA 持久化 | 已完成 | 项目、用例、脑图节点、生成任务均有实体和 Repository |
| 后端真实 AI 生成链路 | 已完成 | `AiTreeifyGenerationService` 实现 E1/E2/E3/Critic，有 mock fallback |
| 前端工作台骨架 | 已完成 | 节点增删移动、大纲、脑图画布、主题切换 |
| 前端生成流程 | 已完成 | auto/step 模式、SSE 接收、候选用例预览、批量确认回填 |
| 前端 API 双模式 | 已完成 | `auto`/`mock`/`real` 三模式切换，mock fallback |
| 前端项目加载 | 已完成 | `useProjectLoader` 加载项目、用例、脑图节点 |

### 1.2 P0 遗留短板（对接文档 §10 已知限制）

| 短板 | 严重程度 | 说明 |
| --- | --- | --- |
| 顶部统计仍前端本地计算 | 低 | 后端 `/cases/stats` 已存在，前端未切换 |
| 节点编辑未持久化 | 高 | 编辑标题/优先级后刷新丢失，当前只在本地 |
| 执行状态未持久化 | 高 | 点击 passed/failed 后刷新丢失 |
| 节点删除未持久化 | 中 | 前端删节点后刷新恢复，后端 DELETE 已存在 |
| `selectedNodeId`/`contextCaseIds` 未接入 | 中 | 生成请求只发 mode+input，丢失当前选区上下文 |
| step 模式 E1/E2 中间结果不传递 | 中 | 后端 confirm 只推进阶段，未把 E1 结果喂给 E2 |
| 生成编排无 Agent 抽象 | 低 | 当前 `AiTreeifyGenerationService` 串行调 3 次 LLM，无独立 Agent 角色 |
| MockTreeifyService 与 MockGenerationService 重复 | 低 | 两份独立场景代码，维护成本 |

### 1.3 数据层现状

- 后端使用 H2（开发）/MySQL（可配置），已有完整 JPA 实体和 Repository
- `TreeifyPersistenceService` 封装了所有 CRUD
- `MockTreeifyService` 同时维护内存缓存和 DB 同步，职责过重
- 生成任务和事件流水已落 DB（`generation_tasks` 表），但 `generation_events` 未落库
- 脑图节点已落 DB（`mindmap_nodes` 表），保存采用全量替换策略

---

## 2. P1 优先级排序

按"用户可感知价值 × 实现成本"排序：

| 优先级 | 候选任务 | 用户价值 | 实现成本 | 排序理由 |
| --- | --- | --- | --- | --- |
| **P1-1** | 节点编辑/删除/执行状态持久化 | 高 | 低 | 刷新丢失是最严重的体验断层，后端接口已存在 |
| **P1-2** | 顶部统计改用 /cases/stats | 中 | 低 | 一行切换，消除前后端数据不一致风险 |
| **P1-3** | step 模式 E1/E2 中间结果传递 | 高 | 中 | step 模式的核心价值依赖阶段间上下文传递 |
| **P1-4** | 生成请求带 selectedNodeId/contextCaseIds | 中 | 中 | 让 AI 生成能感知当前选区，提升用例精准度 |
| **P1-5** | Agent Orchestrator 轻量抽象 | 低 | 中 | 纯后端重构，用户不可直接感知，但为后续扩展铺路 |
| **P1-6** | 摘要 Agent / RAG | 中 | 高 | 需 PostgreSQL + pgvector，涉及基础设施变更 |

---

## 3. 每个任务的详细拆解

### 3.1 P1-1：节点编辑/删除/执行状态持久化 ✅ 已完成

**目标**：用户在工作台上的所有节点操作（编辑标题/优先级/标签、删除节点、切换执行状态）刷新后不丢失。

**完成状态**：通过 `useCasePersistence` hook 实现，监听 `caseDirtyIds`/`statusDirtyIds`/`deletedCaseIds`，debounced 调用后端 API，mock 模式自动跳过。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/features/workspace/workspaceStore.ts` | 编辑/删除/状态变更后标记 dirty，触发自动保存 |
| `frontend/src/features/workspace/useMindmapSave.ts` | 扩展为全量保存（含执行状态、优先级、标签等字段） |
| `frontend/src/components/NodeCard.tsx` | 编辑后调用 store updateNode（已有），确认后触发保存 |
| `frontend/src/components/SelectionBar.tsx` | 删除按钮调用 store deleteSelectedNode（已有），触发保存 |
| `frontend/src/components/Toolbar.tsx` | 执行状态切换后触发保存 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `TestCaseController.java` | 已有 `PUT /cases/{id}`、`DELETE /cases/{id}`、`PATCH /cases/{id}/execution-status`，无需改动 |
| `TreeifyPersistenceService.java` | 已有相关 CRUD，无需改动 |

**API 变化**：无新增接口。需要确认前端正确调用已有接口：

| 接口 | 前端当前行为 | P1 应改为 |
| --- | --- | --- |
| `PUT /api/v1/cases/{caseId}` | 未调用 | 编辑节点后调用，传 title/precondition/steps/expected/priority/tags/version |
| `DELETE /api/v1/cases/{caseId}` | 未调用 | 删除节点后调用 |
| `PATCH /api/v1/cases/{caseId}/execution-status` | 未调用 | 状态切换后调用 |

**验收标准**：

1. 编辑节点标题后刷新页面，标题保持修改后的值
2. 切换执行状态为 passed 后刷新，状态保持 passed
3. 删除一个节点后刷新，节点不再出现
4. 乐观锁冲突（两人同时编辑）返回 409，前端提示"内容已被更新"
5. 脑图整体保存（`PUT /projects/{id}/mindmap`）仍作为兜底可用

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 频繁 PUT 请求导致后端压力 | 低 | debounce 2-3 秒，只在 dirty 且停留后触发 |
| 节点删除后脑图布局断裂 | 中 | 删除后重新计算布局或保留占位 |
| 乐观锁 version 不匹配 | 低 | 前端每次保存前先获取最新 version |

---

### 3.2 P1-2：顶部统计改用 /cases/stats ✅ 已完成

**目标**：顶部统计（总用例数、已测数、通过数、通过率）从后端 `/cases/stats` 接口获取，与后端数据保持一致。

**完成状态**：`useProjectLoader` 加载时调用 `getProjectCaseStats()` 存入 `serverStats`，`App.tsx` 中 `serverStats || localStats` 优先服务端数据，`useCasePersistence` 每次变更后自动刷新。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/features/workspace/workspaceStore.ts` | 新增 `stats` 字段来源选项：`local`（当前）或 `server`（P1） |
| `frontend/src/shared/api/treeify.ts` | 新增 `getCaseStats(projectId)` API 调用 |
| `frontend/src/components/Toolbar.tsx` | 读取 store stats 字段，不再本地计算 |
| `frontend/src/features/workspace/useProjectLoader.ts` | 加载项目时同时拉 stats |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `TestCaseController.java` | 已有 `GET /projects/{id}/cases/stats`，无需改动 |
| `TreeifyPersistenceService.java` | 已有统计计算逻辑，无需改动 |

**API 变化**：无。

后端 `/cases/stats` 已返回：

```json
{
  "total": 10,
  "measured": 6,
  "passed": 4,
  "passRate": 0.67
}
```

**验收标准**：

1. 进入工作台后顶部统计显示后端真实数据
2. 执行状态变更后统计自动刷新（可延迟 1-2 秒）
3. 后端无用例时统计显示 total=0，通过率=0
4. mock 模式下统计仍可本地计算（fallback）

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 统计与脑图节点数不一致 | 低 | 用例增删后立即重新拉 stats |

---

### 3.3 P1-3：step 模式 E1/E2 中间结果传递

> **验证报告**：详细 curl 流程、数据流分析和实现状态见 [docs/P1_step_context_validation.md](P1_step_context_validation.md)

**目标**：step 模式下，E1 的结构化分析结果在确认后传递给 E2，E2 的测试对象清单传递给 E3，形成真正的阶段间上下文链路。

**已完成状态（G1-G6）**：
- G1: `TreeifyGenerationTask` 已增加 e1Result/e2Result/feedback 字段
- G2: `GenerateTaskDto` 已返回 e1Result/e2Result/feedback 字段
- G3: `STAGE_DONE` 已持久化 E1/E2 阶段结果
- G4: `buildAiStepE2Events()` 已消费 e1Result 和 feedback
- G5: `buildAiFinalEvents()` 已消费 e1Result/e2Result 和 feedback
- G6: `ConfirmGenerateTaskRequest.feedback` 已被保存并传入下一阶段 prompt

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/features/generation/useGenerateStream.ts` | 确认后重新订阅 SSE 时，后端应已带着前阶段结果继续 |
| `frontend/src/features/generation/generationStore.ts` | `stage_done` 的 `payload.result` 需正确保存，作为下一阶段展示的上下文 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `AiTreeifyGenerationService.java` | step 模式分支（`buildStepEvents`）需要读取 `generation_tasks.e1_result`/`e2_result`，拼入下一阶段 prompt |
| `MockTreeifyService.java` | `confirmTask()` 需要保存当前阶段结果到 `generation_tasks` 对应字段 |
| `TreeifyPersistenceService.java` | 新增保存 e1_result/e2_result 到 generation_tasks 的方法 |
| `GenerateController.java` | confirm 端点可能需要返回下一阶段的 streamUrl（当前已返回） |

**API 变化**：

| 接口 | 变化 |
| --- | --- |
| `POST /generate/{taskId}/confirm` | Request body 可新增 `feedback` 字段（可选修改意见），后端拼入下一阶段 prompt |

当前 `ConfirmGenerateTaskRequest` 只有 `stage` 字段，需扩展：

```java
public class ConfirmGenerateTaskRequest {
    private String stage;
    private String feedback; // 新增：可选修改意见
}
```

**验收标准**：

1. step 模式 E1 确认后，E2 的 prompt 包含 E1 的 `businessGoals`/`constraints` 等字段
2. step 模式 E2 确认后，E3 的 prompt 包含 E2 的测试对象清单
3. 用户在确认时可附加 `feedback`，后端将其作为补充约束拼入下一阶段
4. E1/E2 结果持久化到 `generation_tasks.e1_result`/`e2_result`，刷新后可恢复
5. auto 模式不受影响（当前链路已含阶段间传递）

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| E1 JSON 解析失败导致 E2 输入为空 | 高 | 解析失败时 fallback 到原始文本拼接 |
| 中间结果体积过大影响 token 预算 | 中 | 对 e1_result/e2_result 做截断或摘要 |
| step 模式下 confirm 后 SSE 需重新订阅 | 低 | 当前已实现重新订阅，无需改动 |

---

### 3.4 P1-4：生成请求带 selectedNodeId/contextCaseIds ✅ 已完成

**目标**：生成请求携带当前选中节点 ID 和关联用例 ID，让 AI 编排层能感知用户正在关注的测试对象，生成更精准的用例。

**完成状态**：前端 `useGenerateStream` 发送 `selectedId` + 所有 case 节点的 `contextCaseIds`。后端 `TreeifyPersistenceService.appendGenerationContext()` 将选中节点和关联用例拼入生成 input。Entity、DTO 均已包含字段。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/shared/api/treeify.ts` | `createGenerateTask` 参数扩展，发送 selectedNodeId + contextCaseIds |
| `frontend/src/features/generation/useGenerateStream.ts` | startGeneration 时从 workspaceStore 取 selectedId 和当前用例 ID 列表 |
| `frontend/src/shared/types/treeify.ts` | `CreateGenerateTaskRequest` 类型新增两个字段 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `CreateGenerateTaskRequest.java` | 新增 `selectedNodeId` 和 `contextCaseIds` 字段 |
| `AiTreeifyGenerationService.java` | prompt 组装时从 selectedNodeId 查出对应用例内容，从 contextCaseIds 查出关联用例，拼入上下文 |
| `MockTreeifyService.java` | 创建任务时存储这两个字段 |
| `TreeifyPersistenceService.java` | 按 caseId 列表查出用例内容供 prompt 组装 |

**API 变化**：

```json
// POST /api/v1/projects/{projectId}/generate
{
  "mode": "step",
  "input": "用户需要支持手机号登录",
  "selectedNodeId": "success-steps",
  "contextCaseIds": [1001, 1002]
}
```

**验收标准**：

1. 前端选中一个节点后启动生成，请求 body 包含该节点的 caseId
2. 后端将选中用例的 title/steps/expected 拼入 E1 prompt 作为参考上下文
3. contextCaseIds 传入的用例内容作为"历史用例参考"拼入 prompt
4. 两个字段均为可选，不传时行为与 P0 一致
5. mock 模式下忽略这两个字段（不影响 mock 场景选择）

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| selectedNodeId 与 caseId 映射关系 | 低 | 节点已有 caseId 字段，直接映射 |
| 大量 contextCaseIds 导致 token 超限 | 中 | 限制最多 5 条，超出截断 |
| 前端 selectedId 为临时节点（无 caseId） | 低 | 传 null，后端跳过 |

---

### 3.5 P1-5：Agent Orchestrator 轻量抽象 ✅ 已完成

**目标**：将当前 `AiTreeifyGenerationService` 中硬编码的串行 LLM 调用，抽象为 `OrchestrationService` + 可配置的 `StageAgent`，为后续多 Agent 协作、重试策略、结构化输出校验铺路。不对用户产生直接感知变化。

**完成状态**：新建 `agent/` 子包，包含 `StageAgent` 接口、`StageContext`/`StageResult` 数据类、`JsonOutputParser` 解析工具、`AiStageAgents`（E1/E2/E3/Critic 四个实现）。`OrchestrationService` 实现 `TreeifyGenerationService`，编排各阶段执行。`TreeifyGenerationConfig` 改为创建 `OrchestrationService`。`AiTreeifyGenerationService` 保留但不再注入。

**涉及前端文件**：无。纯后端重构。

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `service/treeify/OrchestrationService.java` | 编排入口，管理阶段执行顺序、状态持久化、SSE 事件推送 |
| 新增 `service/treeify/StageAgentService.java` | 单阶段 Agent 抽象，接收 AgentContext + input，输出结构化 JSON |
| 重构 `AiTreeifyGenerationService.java` | 退化为 OrchestrationService 的一个策略实现，或直接删除 |
| 重构 `MockTreeifyService.java` | 任务编排逻辑迁移到 OrchestrationService，MockTreeifyService 只保留 mock 数据和 CRUD |
| 新增 `service/treeify/JsonOutputParser.java` | LLM 输出 JSON 解析 + schema 校验（三层防线） |
| `GenerateController.java` | 改为注入 OrchestrationService 而非 MockTreeifyService |

**API 变化**：无外部接口变化。内部调用链路重构。

**验收标准**：

1. OrchestrationService.autoOrchestrate() 产出与当前 AiTreeifyGenerationService 相同的事件序列
2. OrchestrationService.stepOrchestrate() 支持 confirm 后带着前一阶段结果继续
3. LLM 输出 JSON 解析失败时自动修复一次（"请修复 JSON" prompt），二次失败则标记任务 failed
4. Mock 链路不受影响
5. `AiTreeifyGenerationService` 可以暂时保留作为过渡，但 GenerateController 应注入新抽象

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 重构期间 mock/auto 模式可能短暂不稳定 | 高 | 保留旧代码作为 fallback，新代码用 feature flag 切换 |
| 过度抽象导致后续开发更复杂 | 中 | 只做最小抽象：OrchestrationService + StageAgent，不引入 SubAgent 框架 |
| JSON 解析防线增加 LLM 调用次数（修复 prompt） | 低 | 只在解析失败时触发一次，不影响正常流程 |

**建议节奏**：

- 第一步：先做 P1-3（中间结果传递），在实际需求中验证阶段间数据流
- 第二步：再做 P1-5（Orchestrator 抽象），在已有验证数据流的基础上重构

---

### 3.6 P1-6：摘要 Agent / RAG

**目标**：实现项目摘要生成、PRD 文档上传、项目级 RAG 检索。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `frontend/src/features/summaries/` | 摘要状态展示、历史、回滚 |
| 新增 `frontend/src/features/knowledge/` | 知识库管理页 |
| `frontend/src/components/Toolbar.tsx` | 添加摘要入口 |
| `frontend/src/shared/api/treeify.ts` | 新增摘要和知识库 API 调用 |
| `frontend/src/shared/types/treeify.ts` | 新增 ProjectSummary、KnowledgeDocument 类型 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `SummaryController.java` | 摘要 CRUD、历史、回滚 |
| 新增 `KnowledgeController.java` | 知识库上传、列表、删除、检索 |
| 新增 `service/treeify/SummaryAgentService.java` | 摘要生成 + Critic 校验 |
| 新增 `service/treeify/KnowledgeService.java` | 文档切片 + embedding 入库 |
| `domain/entity/ProjectSummary.java` | 已有表结构（需求文档 §2.1.2），需新建实体 |
| 新增 PostgreSQL + pgvector 配置 | `application-pgvector.properties`、Flyway migration |

**API 变化**：新增 8 个接口（需求文档 §3.2、§3.5）

| 接口 | 说明 |
| --- | --- |
| `POST /api/v1/projects/{id}/documents` | 上传 PRD |
| `GET /api/v1/projects/{id}/summary` | 获取当前摘要 |
| `GET /api/v1/projects/{id}/summary/history` | 摘要历史 |
| `POST /api/v1/projects/{id}/summary/rollback/{version}` | 回滚 |
| `POST /api/v1/projects/{id}/knowledge` | 上传知识文档 |
| `GET /api/v1/projects/{id}/knowledge` | 知识库列表 |
| `DELETE /api/v1/knowledge/{documentId}` | 删除 |
| `POST /api/v1/projects/{id}/knowledge/search` | 检索调试 |

**验收标准**：

1. 上传 PRD 后摘要自动生成，展示在工作台
2. 摘要 Critic 校验旧模块不丢失、新功能已加入
3. 摘要版本可回滚到历史版本
4. 知识文档上传后可检索（关键词或语义）
5. 生成任务 prompt 自动注入项目摘要和 RAG 上下文

**风险**：

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| PostgreSQL + pgvector 增加部署复杂度 | 高 | Docker compose 已有 MySQL，需新增 PostgreSQL 容器 |
| 摘要 Agent 输出不稳定 | 中 | Critic 校验 + 重试 |
| embedding 调用额外成本 | 低 | 只在文档上传和用例确认时异步触发 |
| 双数据库事务一致性 | 中 | MySQL 存业务数据，PostgreSQL 存向量，通过 project_id 关联，不做跨库事务 |

---

## 4. 推荐第一批执行任务

按依赖关系和用户价值，建议第一批（1-2 天）做：

| 序号 | 任务 | 理由 |
| --- | --- | --- |
| 1 | **P1-1** 节点编辑/删除/执行状态持久化 | 后端接口已就绪，前端改动最小，消除最严重的刷新丢失体验断层 |
| 2 | **P1-2** 顶部统计改用 /cases/stats | 一行改动，消除前后端数据不一致 |
| 3 | **P1-3** step 模式 E1/E2 中间结果传递 | step 模式核心价值依赖此改动，后端改动集中在 `AiTreeifyGenerationService` |

第一批完成后用户可感知的变化：

- 刷新页面后所有操作结果保留
- 统计数据与后端一致
- step 模式 E2 能真正基于 E1 分析结果生成测试对象

第二批（3-5 天）建议做：

| 序号 | 任务 | 理由 |
| --- | --- | --- |
| 4 | **P1-4** 生成请求带 selectedNodeId/contextCaseIds | 在 P1-3 验证数据流基础上扩展上下文注入 |
| 5 | **P1-5** Agent Orchestrator 轻量抽象 | 在已有验证数据流的基础上重构，风险可控 |

---

## 5. 不建议现在做的任务

### 5.1 摘要 Agent / RAG（P1-6）

**不建议现在做的理由**：

1. **基础设施成本高**：需要引入 PostgreSQL + pgvector，Docker compose 需新增容器，开发环境配置复杂
2. **前端工作量大**：需要新增摘要面板和知识库管理页，当前前端人力应优先集中在核心链路体验
3. **生成链路已可用**：当前 E1/E2/E3/Critic 不依赖摘要和 RAG，prompt 组装的 `projectSummary` 和 `ragContext` 可以暂留为空
4. **依赖 P1-5 先完成**：Orchestrator 抽象后，摘要 Agent 作为新 StageAgent 接入更自然
5. **双数据库运维成本**：MySQL + PostgreSQL 双库对当前 1-2 人团队负担过重

**建议时机**：P1-5 Orchestrator 抽象落地后，且团队有 3+ 人时启动。可先在 MySQL 中建 `project_summaries` 表做关键词检索过渡，pgvector 留到 P2。

### 5.2 其他不建议现在做的

| 任务 | 理由 |
| --- | --- |
| SubAgent 多 Agent 协作架构 | AgentCore + SubAgentManager 框架已搭好，但 speccase 当前 3 阶段不需要独立上下文隔离的 SubAgent，用 StageAgent 轻量抽象足够 |
| 快照与版本回滚 | 需要 `case_snapshots` 表和差异对比 UI，用户价值低于持久化，P2 再做 |
| 导出功能（JSON/CSV/Excel/Markdown） | 后端导出接口未实现，前端导出按钮未绑定，P2 再做 |
| 鉴权与权限 | P0 默认单用户已够用，JWT/session 需要前端路由改造，P2 再做 |
| MCP 集成设置页 | 外部工具对接无紧迫需求，P3 |
| MockTreeifyService 与 MockGenerationService 代码合并 | 低优先级清理，不影响功能，可在 P1-5 重构时顺便处理 |
