# Treeify P2 任务拆解

> 基于 P0 MVP + P1 全部完成，进入 P2 迭代优化阶段。
> 创建时间：2026-04-29
> 当前分支：`codex/backend-contracts`

---

## 1. 当前状态

P0（核心生成链路）和 P1（持久化 + RAG）全部完成：
- P0：后端 mock/AI API、前端工作台、SSE 生成、JPA 持久化、Docker 部署
- P1-1：节点编辑/删除/执行状态持久化
- P1-2：顶部统计改用 /cases/stats
- P1-3：step 模式 E1/E2 中间结果传递
- P1-4：生成请求带 selectedNodeId/contextCaseIds
- P1-5：Agent Orchestrator 抽象
- P1-6：摘要 Agent / RAG + 前端面板

---

## 2. P2 优先级排序

按"用户可感知价值 × 实现成本"排序：

| 优先级 | 任务 | 用户价值 | 实现成本 | 排序理由 |
| --- | --- | --- | --- | --- |
| **P2-1** | 用例导出（JSON/CSV/Markdown） | 高 | 低 | 前端按钮已存在但未绑定，后端改动小 |
| **P2-2** | 快照与版本回滚 | 高 | 中 | 已有 snapshotCurrentResult 骨架，需扩展为持久化快照 |
| **P2-3** | 执行记录与历史追踪 | 高 | 中 | 当前只有状态字段，缺少执行历史、失败原因 |
| **P2-4** | 分享只读视图 | 中 | 低 | 生成 share token + 前端只读模式 |
| **P2-5** | 画布自动布局与拖拽 | 中 | 中 | 纯前端，引入 dagre 布局算法 |
| **P2-6** | 用户认证与权限 | 高 | 高 | JWT + 路由守卫 + RBAC，涉及前后端大量改动 |
| **P2-7** | pgvector 语义 RAG（可选） | 中 | 高 | 替换 H2 关键词搜索，需 PostgreSQL 基础设施 |

---

## 3. 每个任务的详细拆解

### 3.1 P2-1：用例导出（JSON/CSV/Markdown）

**目标**：用户可将当前项目的测试用例导出为 JSON、CSV、Markdown 格式文件。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/Toolbar.tsx` | 导出按钮改为弹出格式选择菜单 |
| `frontend/src/shared/api/treeify.ts` | 新增 `exportCases(projectId, format)` API |
| `frontend/src/App.tsx` | `handleExportCases` 改为调用后端 API 或保留本地导出 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `ExportController.java` | `GET /projects/{id}/cases/export?format=json|csv|markdown` |
| 新增 `service/treeify/ExportService.java` | 用例数据格式化为不同输出格式 |

**API 变化**：

| 接口 | 说明 |
| --- | --- |
| `GET /api/v1/projects/{id}/cases/export?format=json` | 导出 JSON |
| `GET /api/v1/projects/{id}/cases/export?format=csv` | 导出 CSV |
| `GET /api/v1/projects/{id}/cases/export?format=markdown` | 导出 Markdown |

**验收标准**：
1. 点击"导出用例"按钮弹出格式选择（JSON/CSV/Markdown）
2. 选择格式后浏览器下载文件
3. 导出内容包含：标题、前置条件、步骤、预期结果、优先级、标签、执行状态
4. CSV 格式可被 Excel 正确打开
5. Markdown 格式可读性良好

---

### 3.2 P2-2：快照与版本回滚 ✅ 已完成

**目标**：用户可保存当前工作台快照，并在需要时回滚到历史版本。

**完成状态**：前后端完整实现。快照存储 mindmap 节点 JSON 数据，支持创建、列表、删除、回滚操作。回滚前有确认提示。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/Toolbar.tsx` | 快照按钮（Camera 图标） |
| 新增 `frontend/src/components/SnapshotPanel.tsx` | 快照列表、创建、回滚、删除 |
| `frontend/src/shared/api/treeify.ts` | 快照 CRUD API |
| `frontend/src/shared/types/treeify.ts` | SnapshotDto 类型 |
| `frontend/src/features/workspace/workspaceStore.ts` | snapshotOpen 状态和 toggle/close actions |
| `frontend/src/App.tsx` | 接入 SnapshotPanel，handleRestore 回调 |
| `frontend/src/styles/app.css` | snapshot-panel 样式 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `SnapshotController.java` | 快照 CRUD |
| 新增 `service/treeify/SnapshotService.java` | 快照保存/恢复逻辑 |
| 新增 `domain/entity/TreeifyCaseSnapshot.java` | 快照实体 |
| 新增 `domain/repository/TreeifyCaseSnapshotRepository.java` | 快照 Repository |
| 新增 `dto/SnapshotDto.java`、`dto/CreateSnapshotRequest.java` | DTO |

**API 变化**：

| 接口 | 说明 |
| --- | --- |
| `POST /api/v1/projects/{id}/snapshots` | 创建快照（body 可含 name, description, data） |
| `GET /api/v1/projects/{id}/snapshots` | 快照列表 |
| `GET /api/v1/snapshots/{id}` | 获取单个快照 |
| `DELETE /api/v1/snapshots/{id}` | 删除快照 |

**验收标准**：
1. 点击"保存快照"后当前工作台状态持久化 ✅
2. 快照列表显示时间、节点数、名称 ✅
3. 回滚后工作台恢复到快照时的状态 ✅
4. 回滚前有确认提示 ✅

---

### 3.3 P2-3：执行记录与历史追踪

**目标**：每个测试用例可记录多次执行历史，包含执行人、时间、结果、失败原因。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `frontend/src/components/ExecutionPanel.tsx` | 执行历史列表、添加执行记录 |
| `frontend/src/components/SelectionBar.tsx` | 执行状态旁显示最近执行信息 |
| `frontend/src/shared/api/treeify.ts` | 执行记录 CRUD API |
| `frontend/src/shared/types/treeify.ts` | ExecutionRecordDto 类型 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `ExecutionRecordController.java` | 执行记录 CRUD |
| 新增 `domain/entity/ExecutionRecord.java` | 执行记录实体 |
| 新增 `service/treeify/ExecutionRecordService.java` | 执行记录业务逻辑 |

**API 变化**：

| 接口 | 说明 |
| --- | --- |
| `POST /api/v1/cases/{id}/executions` | 添加执行记录 |
| `GET /api/v1/cases/{id}/executions` | 查询执行历史 |
| `GET /api/v1/projects/{id}/executions` | 项目级执行汇总 |

**验收标准**：
1. 选中用例后可查看执行历史列表
2. 可添加新的执行记录（状态、备注、执行人）
3. 顶部统计基于真实执行记录计算
4. 执行历史按时间倒序排列

---

### 3.4 P2-4：分享只读视图

**目标**：用户可生成分享链接，他人通过链接以只读模式查看项目用例。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/Toolbar.tsx` | 分享按钮生成链接 |
| `frontend/src/App.tsx` | 只读模式下隐藏编辑操作 |
| `frontend/src/features/workspace/workspaceStore.ts` | readonly 状态 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `ProjectController.java` | 新增 `POST /projects/{id}/share` 生成 token |
| `domain/entity/ProjectShare.java` | 分享 token 实体 |

**API 变化**：

| 接口 | 说明 |
| --- | --- |
| `POST /api/v1/projects/{id}/share` | 生成分享 token |
| `GET /api/v1/projects/{id}/share` | 获取当前分享链接 |

**验收标准**：
1. 点击"用例分享"生成唯一链接
2. 通过链接访问时进入只读模式
3. 只读模式下不可编辑、删除、生成
4. 分享链接可随时撤销

---

### 3.5 P2-5：画布自动布局与拖拽

**目标**：引入自动布局算法替代固定坐标，支持拖拽调整节点位置。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/MindMapCanvas.tsx` | 引入 dagre 布局、拖拽事件 |
| `frontend/src/utils/layout.ts` | 新增布局算法工具函数 |
| `frontend/src/styles/app.css` | 拖拽样式 |

**验收标准**：
1. 节点增删后自动重新布局
2. 可拖拽节点调整位置
3. 大量节点（100+）时渲染流畅

---

### 3.6 P2-6：用户认证与权限

**目标**：实现用户注册/登录、JWT 认证、项目级权限控制。

**涉及前端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `frontend/src/pages/LoginPage.tsx` | 登录/注册页 |
| 新增 `frontend/src/features/auth/` | 认证状态管理、token 存储 |
| `frontend/src/App.tsx` | 路由守卫 |

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| 新增 `AuthController.java` | 登录/注册/token 刷新 |
| 新增 `security/` 包 | JWT 工具、认证过滤器 |
| `domain/entity/User.java` | 用户实体 |

**验收标准**：
1. 未登录时跳转登录页
2. 登录后可访问所有功能
3. 不同角色（owner/editor/viewer）有不同权限
4. token 过期自动刷新

---

### 3.7 P2-7：pgvector 语义 RAG（可选）

**目标**：将知识库关键词搜索升级为基于 pgvector 的语义检索。

**涉及后端文件**：

| 文件 | 改动 |
| --- | --- |
| `KnowledgeService.java` | 替换关键词搜索为向量相似度搜索 |
| 新增 `EmbeddingService.java` | 调用 embedding API |
| 新增 PostgreSQL + pgvector 配置 | Docker compose 扩展 |

**验收标准**：
1. 语义搜索结果比关键词搜索更准确
2. 支持文档切片和 embedding 入库
3. Docker compose 包含 PostgreSQL 容器

---

## 4. 推荐执行顺序

| 阶段 | 任务 | 预计时间 | 理由 |
| --- | --- | --- | --- |
| 第一批 | P2-1 导出 | 0.5 天 | 前端按钮已存在，改动最小，用户可立即感知 |
| 第一批 | P2-4 分享只读 | 0.5 天 | 改动小，提升协作体验 |
| 第二批 | P2-2 快照回滚 | 1 天 | 用户价值高，中等复杂度 |
| 第二批 | P2-3 执行记录 | 1 天 | 完善测试管理闭环 |
| 第三批 | P2-5 自动布局 | 1-2 天 | 纯前端优化，提升使用体验 |
| 第四批 | P2-6 认证权限 | 2-3 天 | 涉及前后端大量改动，需仔细设计 |
| 可选 | P2-7 pgvector | 1-2 天 | 需 PostgreSQL 基础设施，视团队情况决定 |
