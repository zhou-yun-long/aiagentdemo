# Requirements Document

## Introduction

本特性是对现有 SpecCase / Treeify AI 测试用例生成产品的一次协调升级，目标是将其演进为面向测试团队的「测试平台」。本次改造在不破坏既有 SSE / DTO / 数据库现状的前提下，完成以下三件事：

1. **品牌与信息架构升级**：全局品牌从 "SpecCase / Treeify / 项目工作区" 重命名为 "测试平台"；引入项目级路由结构 `/projects/:projectId/...` 和持久化左侧边栏，将原有零散功能聚合为「仪表盘 / 用例管理 / 用例生成 / 测试计划 / 测试报告」五大模块，将原有 项目管理 / 知识库 / 摘要 / 集成 等收纳到「系统设置」分组。
2. **用例生成页对齐设计稿**：完整落地 Tab 切换 (功能 / 接口 Beta)、需求输入 (文件 + 文本)、测试维度 (业务场景 + 三列维度)、颗粒度 (S/M/L)、生成配置 (目标平台 / 输出格式 / 自定义 Prompt / 参考用例) 和双主操作 (生成测试用例 / 生成测试点)；将 2MB base64 附件链路升级为 50MB multipart 直传。
3. **新增测试计划与测试报告模块**：补齐测试活动从 启动 → 执行 → 收口 的闭环。

本文档只描述行为契约（What），技术方案（How）由设计阶段产出。每条需求的验收标准都按 EARS 模式书写，便于拆给多名开发者并行实现。

## Glossary

- **测试平台 (Testing_Platform)**：本次改造后产品对外展示的统一品牌名，前端可见文案使用此名替代 SpecCase / Treeify / 项目工作区。
- **Frontend_App**：基于 React + Vite 的单页前端应用，承担路由、布局、模块视图与 SSE 渲染。
- **Sidebar**：项目内统一的左侧边栏组件，承载品牌、当前项目切换、五大模块导航、系统设置分组与折叠按钮。
- **ProjectLayout**：以 `/projects/:projectId` 为根的路由布局，包含 Sidebar 与右侧 Outlet。
- **Module**：本次定义的五大业务模块之一：仪表盘 / 用例管理 / 用例生成 / 测试计划 / 测试报告。
- **Dashboard_Module**：仪表盘模块，聚合用例总数、通过率、优先级分布、最近生成任务、最近测试计划、Critic 评分趋势。
- **Case_Module**：用例管理模块，提供「列表视图」与「思维导图视图」双视图。
- **List_View**：用例管理的列表视图（沿用 CasesPage 能力：分页、过滤、搜索、批量操作、导出、详情编辑）。
- **MindMap_View**：用例管理的思维导图视图（沿用现 App.tsx 的 MindMapCanvas 与多面板）。
- **Generate_Module**：用例生成模块。
- **Plan_Module**：测试计划模块。
- **Report_Module**：测试报告模块。
- **Backend_Service**：现有 Spring Boot 后端服务，对外提供 `/api/v1/**` 接口与 SSE 流。
- **Orchestration_Service**：后端 OrchestrationService，按 E1 → E2 → E3 → Critic 阶段编排生成任务。
- **AiStageAgents**：现有功能测试视角的 E1 / E2 / E3 / Critic Sub-agent Prompt 构造器。
- **ApiStageAgents**：本次新增的接口测试视角的 E1 / E2 / E3 Sub-agent Prompt 构造器。
- **Generation_Config**：本次新增的 GenerationConfig 子对象，承载 `taskKind` / `businessScenarios` / `dimensions` / `granularity` / `targetPlatforms` / `outputFormat` / `customPrompt` / `referenceCases` 等可空字段。
- **TaskKind**：生成任务类型，取值 `cases`（功能测试用例完整链路）、`points`（仅生成测试点，E2 后截断）、`api_cases`（接口测试用例 Beta，走 ApiStageAgents）。
- **Generation_Granularity**：用例颗粒度档位，取值 `S` (简略，2~3 条/对象)、`M` (标准，5~8 条/对象)、`L` (详细，10+ 条/对象)；缺省值为 `M`。
- **Functional_Tab**：用例生成页顶部「功能测试用例」Tab（本期完整功能）。
- **Api_Tab**：用例生成页顶部「接口测试用例 Beta」Tab（本期可提交 `taskKind=api_cases` 的生成任务）。
- **History_Drawer**：用例生成页右上角「查看功能历史记录」按钮打开的抽屉，列出当前项目的历史生成任务。
- **SSE_Contract**：现有 SSE 事件契约：`data` 字段是单一 JSON，业务事件类型从 `data.event` 读取，包含 `stage_started` / `stage_chunk` / `stage_done` / `generation_complete`。
- **Points_Complete_Event**：本次新增的 SSE 事件 `points_complete`，承载「生成测试点」模式下 E2 截止后的测试点列表。
- **Test_Plan**：treeify_test_plan 表对应的实体，含名称、描述、起止时间、用例集合、可指派执行人、状态 (`draft|active|done|archived`)。
- **Plan_Case**：treeify_plan_case 表对应的实体，描述「测试计划 ↔ 用例」关系及单条用例的执行结果 (`pass|fail|blocked|skipped`) 与备注。
- **Test_Report**：treeify_test_report 表对应的实体，按测试计划维度生成的汇总报告。
- **Excel_Template**：后端 `resources/templates/case_export.xlsx` 模板，用于「标准用例 Excel」导出。
- **Dimensions_Dictionary**：业务场景与测试维度字典，存放路径 `resources/data/test_dimensions.json`，可由运维直接编辑且不改 Java 代码。
- **Legacy_Route**：本次替换前的查询参数路由，包括 `/?projectId=` 与 `/cases?projectId=`。
- **Multipart_Upload**：基于 `multipart/form-data` 的二进制文件上传通道，区别于现行的 base64 内嵌 JSON 上传。
- **Single_File_Limit**：本次定义的单文件大小上限 50MB（52428800 字节）。

## Requirements

### Requirement 1: 品牌与全局命名为「测试平台」

**User Story:** As a 测试平台用户, I want 产品的所有用户可见品牌名统一为「测试平台」, so that 我不会被 SpecCase / Treeify / 项目工作区 等历史名称混淆。

#### Acceptance Criteria

1. THE Frontend_App SHALL 在浏览器标签 (`<title>`)、Sidebar 顶部品牌区、登录页/欢迎页与 README 顶部标题中显示文本 "测试平台"。
2. THE Frontend_App SHALL NOT 在任何用户可见 UI 中出现 "SpecCase"、"speccase"、"Treeify" 或 "项目工作区" 字样。
3. WHERE 文件位于 `frontend/src/**`、`frontend/index.html` 或仓库 `README.md` 顶部 H1 标题, THE Frontend_App SHALL 使用 "测试平台" 作为展示文案。
4. THE Backend_Service SHALL 保持 Java 包名 (`com.zoujuexian.aiagentdemo`)、数据库表前缀 (`treeify_*`)、内部字段名与既有 API 路径不变。
5. WHEN 前端导出用例文件 (CSV / JSON / Markdown / Excel), THE Frontend_App SHALL 使用 "testing-platform" 作为默认导出文件名前缀，替代历史 "speccase-" 前缀。

### Requirement 2: 项目级路由结构与侧边栏导航

**User Story:** As a 测试工程师, I want 一个以项目为中心、带持久左侧边栏的导航结构, so that 我能在同一个项目下快速跳转五大模块以及系统设置。

#### Acceptance Criteria

1. WHEN 用户访问 `/`, THE Frontend_App SHALL 重定向至 `/projects`。
2. WHEN 用户访问 `/projects`, THE Frontend_App SHALL 渲染 "我的项目" 列表页（沿用 ProjectsPage 能力）。
3. WHEN 用户访问 `/projects/:projectId`, THE Frontend_App SHALL 渲染 ProjectLayout，左侧为 Sidebar，右侧为路由 Outlet。
4. WHEN 用户访问 `/projects/:projectId` 而未指定子路径, THE Frontend_App SHALL 重定向至 `/projects/:projectId/dashboard`。
5. THE Sidebar SHALL 提供五个模块入口，分别指向 `/projects/:projectId/dashboard`、`/projects/:projectId/cases`、`/projects/:projectId/generate`、`/projects/:projectId/plans`、`/projects/:projectId/reports`。
6. THE Sidebar SHALL 在顶部展示品牌 "测试平台" 与当前项目切换下拉框，下拉选项来自 `GET /api/v1/projects` 的返回结果。
7. WHEN 用户在 Sidebar 中切换当前项目, THE Frontend_App SHALL 在路径中替换 `:projectId` 并保留当前模块路径段。
8. THE Sidebar SHALL 提供可折叠的「系统设置」分组，分组内至少包含 "项目管理"、"知识库"、"摘要"、"集成" 四个入口，且每个入口打开后能继续访问现有同名功能视图。
9. THE Sidebar SHALL 提供折叠 / 展开按钮，按钮触发后 Sidebar 在折叠态宽度为 56px、展开态宽度为 220px，且折叠状态 SHALL 持久化到 `localStorage` 键 `testing-platform.sidebar.collapsed`，下次进入站点时恢复。
10. WHILE 用户处于 `/share/:shareToken` 路由, THE Frontend_App SHALL 渲染既有分享视图（不展示 Sidebar），且仍可正常加载分享内容。
11. WHEN 用户点击 Sidebar 中已激活的模块入口, THE Frontend_App SHALL 不触发整页刷新且保持当前 URL 不变。

### Requirement 3: 仪表盘模块

**User Story:** As a 测试经理, I want 在项目仪表盘看到核心质量指标和最近活动, so that 我能快速判断项目当前状态而不必逐个进入各模块。

#### Acceptance Criteria

1. WHEN 用户进入 `/projects/:projectId/dashboard`, THE Frontend_App SHALL 调用聚合接口 `GET /api/v1/projects/{id}/dashboard` 并展示返回数据。
2. THE Dashboard_Module SHALL 展示「用例总数」「通过率（passRate，0~100 的整数）」「优先级分布（P0/P1/P2/P3 各自数量）」三类核心指标。
3. IF 后端返回的 `passRate` 值大于 100 或小于 0, THEN THE Dashboard_Module SHALL 在展示前将其裁剪到 `[0, 100]` 区间，并 SHALL NOT 抛出错误。
4. THE Dashboard_Module SHALL 展示「最近 5 个生成任务」列表，每条至少含任务创建时间、模式 (auto / step)、`taskKind`、状态、Critic 评分（如有）。
5. THE Dashboard_Module SHALL 展示「最近 5 个测试计划」列表，每条至少含计划名称、状态、起止时间。
6. THE Dashboard_Module SHALL 展示「Critic 评分趋势（近 7 次）」折线，数据来源为最近 7 个已完成生成任务的 `criticScore`，按完成时间升序排列；不足 7 条时按实际数量展示。
7. WHEN `GET /api/v1/projects/{id}/dashboard` 返回错误码 `code != 0`, THE Frontend_App SHALL 在仪表盘区域展示错误提示并提供「重试」按钮，且不抛出未捕获异常。
8. THE Backend_Service SHALL 在 `GET /api/v1/projects/{id}/dashboard` 响应的 `data` 字段中返回如下 camelCase 字段：`totalCases`、`passRate`、`priorityDistribution`、`recentTasks`、`recentPlans`、`criticTrend`。
9. THE Backend_Service SHALL 在仪表盘聚合实现中复用既有 `getProjectCaseStats` 与生成历史接口的查询逻辑，不引入新的统计口径。

### Requirement 4: 用例管理模块（列表 + 思维导图双视图）

**User Story:** As a 测试工程师, I want 在同一个用例管理页中切换列表视图与思维导图视图, so that 我既能批量编辑用例又能看到结构关系，而不需要在不同入口之间跳转。

#### Acceptance Criteria

1. WHEN 用户进入 `/projects/:projectId/cases`, THE Case_Module SHALL 渲染顶部 Tab，包含「列表视图」与「思维导图视图」两个选项。
2. THE Case_Module SHALL 默认激活「列表视图」并保持现有 CasesPage 能力（分页、过滤、搜索、批量操作、导出、详情编辑）可用。
3. WHEN 用户切换到「思维导图视图」, THE Case_Module SHALL 渲染现有 App.tsx 的 MindMapCanvas 与多面板（含 AI 助手 / 知识库 / 摘要 / Snapshot / 集成 / 分享 等），且仅在画布工作区域显示，不替换 Sidebar。
4. THE Case_Module SHALL 在两种视图下使用同一份用例数据源（`GET /api/v1/projects/{id}/cases`），切换视图时 SHALL NOT 丢失或修改用户在另一视图所做的未保存变更。
5. WHEN 用户访问历史 URL `/cases?projectId=:id`, THE Frontend_App SHALL 重定向至 `/projects/:id/cases`。
6. WHEN 用户访问历史 URL `/?projectId=:id`, THE Frontend_App SHALL 重定向至 `/projects/:id/cases`（默认进入用例管理）。
7. THE Case_Module SHALL 保留视图切换状态到 `localStorage` 键 `testing-platform.cases.viewMode`，下次进入同一项目用例管理页时恢复上次激活的 Tab。

### Requirement 5: 用例生成模块 - 需求输入与历史记录

**User Story:** As a 测试工程师, I want 在用例生成页通过文件或文本提供需求输入，并能查看与重放本项目的历史生成任务, so that 我能复用之前的输入并对比生成结果。

#### Acceptance Criteria

1. WHEN 用户进入 `/projects/:projectId/generate`, THE Generate_Module SHALL 在页面顶部渲染两个 Tab：「功能测试用例」(默认激活) 与「接口测试用例 Beta」。
2. THE Generate_Module SHALL 在 Functional_Tab 下渲染「需求输入」卡片，卡片内提供「文件上传」与「文本输入」两个分段切换按钮。
3. WHILE 「文件上传」分段被激活, THE Generate_Module SHALL 渲染拖拽上传区，接受扩展名为 `.md`、`.docx`、`.pdf`、`.txt` 的文件。
4. IF 用户上传扩展名不属于 `.md`、`.docx`、`.pdf`、`.txt` 的文件, THEN THE Generate_Module SHALL 拒绝该文件并展示错误提示「仅支持 .md / .docx / .pdf / .txt」。
5. IF 用户上传单个文件大小超过 Single_File_Limit (50MB), THEN THE Generate_Module SHALL 拒绝该文件并展示错误提示「单文件不能超过 50MB」。
6. WHILE 「文本输入」分段被激活, THE Generate_Module SHALL 渲染多行文本框，允许用户直接粘贴 / 输入需求描述。
7. THE Generate_Module SHALL 在「需求输入」卡片右上角渲染「查看功能历史记录」按钮，按钮点击后打开 History_Drawer。
8. WHEN History_Drawer 被打开, THE Generate_Module SHALL 调用 `GET /api/v1/projects/{id}/generate/history` 拉取当前项目的历史生成任务列表，并展示任务创建时间、模式 (auto / step)、`taskKind`、状态、Critic 评分（如有）、输入摘要。
9. WHEN 用户在 History_Drawer 中点击某条任务, THE Generate_Module SHALL 通过 `GET /api/v1/generate/{taskId}/events` 重放该任务历史 SSE 事件并按现有 SSE_Contract 渲染流程。

### Requirement 6: 用例生成模块 - 测试维度与颗粒度

**User Story:** As a 测试工程师, I want 在用例生成页通过业务场景、细分维度和颗粒度档位精准约束生成结果, so that 生成的用例在覆盖范围与数量上符合我的预期。

#### Acceptance Criteria

1. THE Generate_Module SHALL 在 Functional_Tab 下渲染「测试维度」卡片，卡片顶部为「业务场景」Tab 多选，至少包含「通用」「文档产品」「视频产品」「全覆盖」四个选项。
2. THE Generate_Module SHALL 在「测试维度」卡片下方渲染三列细分维度多选区，每列顶部提供「全选」与「清空」两个快捷操作，且每个维度项可显示 P0 标记。
3. THE Backend_Service SHALL 在 `resources/data/test_dimensions.json` 中维护 Dimensions_Dictionary（业务场景与三列细分维度），并通过 `GET /api/v1/generation/dimensions` 返回；前端在进入用例生成页时拉取该字典渲染。
4. WHEN `resources/data/test_dimensions.json` 被修改并重启服务后再调用 `GET /api/v1/generation/dimensions`, THE Backend_Service SHALL 返回更新后的字典内容（即字典内容可被运维通过编辑该 JSON 文件并重启实现调整，无需修改 Java 源码）。
5. THE Generate_Module SHALL 在 Functional_Tab 下渲染「用例颗粒度」卡片，提供单选档位 `S 简略 (2-3 条/对象)`、`M 标准 (5-8 条/对象)`（默认选中）、`L 详细 (10+ 条/对象)`。
6. WHEN 用户提交生成任务, THE Generate_Module SHALL 把当前业务场景、细分维度、颗粒度档位作为 Generation_Config 子对象写入 `POST /api/v1/projects/{id}/generate` 请求体，字段名分别为 `businessScenarios`（字符串数组）、`dimensions`（字符串数组）、`granularity`（取值 `S` / `M` / `L`）。
7. THE Orchestration_Service SHALL 在调用 AiStageAgents / ApiStageAgents 时，将 Generation_Config 中的业务场景、细分维度白名单、颗粒度数量约束注入到对应 Sub-agent 的 Prompt 中，使生成结果在维度命中与每对象用例条数上遵循配置。

### Requirement 7: 用例生成模块 - 生成配置（平台 / 输出格式 / 自定义 Prompt / 参考用例）

**User Story:** As a 测试工程师, I want 自定义目标平台、输出格式、Prompt 片段与参考用例, so that 生成的用例能贴合我的项目上下文与下游消费方式。

#### Acceptance Criteria

1. THE Generate_Module SHALL 在 Functional_Tab 下渲染「生成配置」卡片。
2. THE Generate_Module SHALL 在「生成配置」中提供「目标平台」多选，选项至少包含「不限」「Windows」「macOS」「Android」「iOS」「Web」六个值。
3. THE Generate_Module SHALL 在「生成配置」中提供「输出格式」单选，选项为「标准用例 Excel」「表格」「JSON」三项。
4. THE Generate_Module SHALL 在「生成配置」中提供「自定义 Prompt」多行文本框，允许为空。
5. THE Generate_Module SHALL 在「生成配置」中提供「参考用例文件上传」入口，接受 `.xlsx` / `.csv` / `.json` 类型的参考用例文件，并允许同时上传多份。
6. WHEN 用户提交生成任务, THE Generate_Module SHALL 在 Generation_Config 中携带字段 `targetPlatforms`（字符串数组）、`outputFormat`（取值 `excel` / `table` / `json`）、`customPrompt`（字符串，可空）、`referenceCases`（字符串数组，元素为参考用例附件直传后获得的 `attachmentId`，可空）。
7. THE Orchestration_Service SHALL 在 Prompt 中注入目标平台标签、自定义 Prompt 片段以及参考用例 few-shot 示例（基于 `referenceCases` 中的 `attachmentId` 解析出的样例），使生成结果贴近平台语境与参考用例风格。
8. IF Generation_Config 中所有新字段均缺省（即 `null` 或空数组）, THEN THE Backend_Service SHALL 按未升级前的默认行为生成用例，且 SHALL NOT 报错。

### Requirement 8: 用例生成模块 - 「生成测试用例」与「生成测试点」双模式

**User Story:** As a 测试工程师, I want 在用例生成页同时拥有「生成完整测试用例」与「只生成测试点」两个主操作, so that 我能在前期快速产出测试点列表，再在后期跑完整链路得到可执行用例。

#### Acceptance Criteria

1. THE Generate_Module SHALL 在 Functional_Tab 底部渲染两个并列主操作按钮：「生成测试用例」与「生成测试点」。
2. WHEN 用户点击「生成测试用例」, THE Frontend_App SHALL 在 Generation_Config 中将 `taskKind` 字段设置为字符串 `"cases"` 并提交。
3. WHEN 用户点击「生成测试点」, THE Frontend_App SHALL 在 Generation_Config 中将 `taskKind` 字段设置为字符串 `"points"` 并提交。
4. WHEN Backend_Service 收到 `taskKind = "cases"` 的生成任务, THE Orchestration_Service SHALL 按照 E1 → E2 → E3 → Critic 完整链路执行，并按现有 SSE_Contract 推送 `stage_started` / `stage_chunk` / `stage_done` / `generation_complete` 事件。
5. WHEN Backend_Service 收到 `taskKind = "points"` 的生成任务, THE Orchestration_Service SHALL 在 E2 阶段完成后停止后续阶段，且 SHALL 推送一个新的 SSE 事件 `points_complete`，其 `data.event` 为字符串 `"points_complete"`，`data.payload.points` 为来自 E2 输出的测试点数组（每条至少含 `objectId`、`title`、`priority` 字段）。
6. THE Generate_Module SHALL 在收到 `points_complete` 事件后，渲染测试点列表视图，且 SHALL NOT 等待后续 `stage_done` 或 `generation_complete` 事件。
7. THE SSE_Contract SHALL 保留现有 `stage_started` / `stage_chunk` / `stage_done` / `generation_complete` 事件名与 payload 字段不变；`points_complete` SHALL 仅在 `taskKind = "points"` 任务下出现。

### Requirement 9: 接口测试用例 Beta（ApiStageAgents 链路）

**User Story:** As a 测试工程师, I want 在「接口测试用例 Beta」Tab 提交针对接口测试视角的生成任务, so that 我能让 AI 输出更贴近接口契约的用例草稿。

#### Acceptance Criteria

1. THE Generate_Module SHALL 在用例生成页顶部渲染「接口测试用例 Beta」Tab。
2. WHEN 用户切换到 Api_Tab, THE Generate_Module SHALL 渲染「需求输入」「测试维度（接口分组维度）」「生成配置」与单一主操作按钮「生成接口用例」，且复用 Requirement 5 / 6 / 7 中相同的输入控件结构。
3. WHEN 用户在 Api_Tab 点击「生成接口用例」, THE Frontend_App SHALL 在 Generation_Config 中将 `taskKind` 字段设置为字符串 `"api_cases"` 并提交。
4. WHEN Backend_Service 收到 `taskKind = "api_cases"` 的生成任务, THE Orchestration_Service SHALL 按照 ApiStageAgents 中的 E1 / E2 / E3 Prompt 执行接口测试视角的生成链路，并按现有 SSE_Contract 推送 `stage_started` / `stage_chunk` / `stage_done` / `generation_complete` 事件。
5. WHEN Backend_Service 收到 `taskKind = "api_cases"` 的生成任务, THE Backend_Service SHALL NOT 调用 AiStageAgents 的功能测试 Prompt；反向，`taskKind = "cases"` 或 `"points"` 时 SHALL NOT 调用 ApiStageAgents。
6. WHEN 用户从 Api_Tab 切回 Functional_Tab, THE Generate_Module SHALL 恢复 Functional_Tab 上一次的输入内容、配置卡片选择与未提交的草稿状态。
7. THE Api_Tab 顶部 SHALL 显示 "Beta" 角标，提示用户当前能力为试验阶段。

### Requirement 10: 测试计划模块

**User Story:** As a 测试经理, I want 创建测试计划、把项目用例集分配到计划、指派执行人并跟踪每条用例的执行结果, so that 我能跟进一次测试活动从启动到收口的完整过程。

#### Acceptance Criteria

1. WHEN 用户进入 `/projects/:projectId/plans`, THE Plan_Module SHALL 渲染当前项目的测试计划列表，每条至少展示名称、状态、起止时间、执行进度（已通过 / 总数）。
2. THE Plan_Module SHALL 提供「新建计划」入口，新建表单要求填写名称（必填）、描述、起止时间、绑定本项目用例集合（多选）、可指派执行人（可空）、状态（默认 `draft`）。
3. THE Test_Plan SHALL 通过新增数据库表 `treeify_test_plan` 持久化，状态字段取值集合为 `draft` / `active` / `done` / `archived`。
4. THE Plan_Case SHALL 通过新增数据库表 `treeify_plan_case` 持久化，记录 `plan_id`、`case_id`、`assignee_id`（可空）、`execution_result`（取值 `pass` / `fail` / `blocked` / `skipped`，可空）、`note`（可空）。
5. WHEN 用户进入测试计划详情页, THE Plan_Module SHALL 列出该计划绑定的所有用例，并允许对每条用例选择执行结果与填写备注，提交后通过 `POST /api/v1/plans/{planId}/cases/{caseId}/result` 持久化。
6. THE Backend_Service SHALL 接受对 `POST /api/v1/plans/{planId}/cases/{caseId}/result` 的调用而不要求调用方先访问过测试计划详情页 UI，仅以请求权限作为唯一前置条件。
7. THE Backend_Service SHALL 提供测试计划 CRUD 接口：`POST /api/v1/projects/{id}/plans`、`GET /api/v1/projects/{id}/plans`、`GET /api/v1/plans/{planId}`、`PUT /api/v1/plans/{planId}`、`DELETE /api/v1/plans/{planId}`，所有响应使用统一格式 `{ code, message, data, requestId }`。
8. THE Backend_Service SHALL 在 `treeify_test_plan` 与 `treeify_plan_case` 两张表中使用 snake_case 字段命名，且 SHALL 提供 Flyway / SQL 迁移脚本以创建表结构。
9. THE Plan_Module API SHALL 在请求与响应体中使用 camelCase 字段命名（例如 `planId`、`startDate`、`endDate`、`executionResult`）。

### Requirement 11: 测试报告模块

**User Story:** As a 测试经理, I want 基于测试计划生成可分享与可导出的测试报告, so that 我能向干系人交付一次测试活动的结论。

#### Acceptance Criteria

1. WHEN 用户进入 `/projects/:projectId/reports`, THE Report_Module SHALL 渲染按测试计划维度组织的报告列表，每条至少含报告名称、关联计划、生成时间、通过率。
2. THE Test_Report SHALL 通过新增数据库表 `treeify_test_report` 持久化，字段使用 snake_case，至少包含 `id`、`project_id`、`plan_id`、`name`、`summary_json`、`created_at`、`created_by`（可空）。
3. WHEN 用户在测试计划详情页或报告列表点击「生成报告」, THE Backend_Service SHALL 通过 `POST /api/v1/plans/{planId}/reports` 同步聚合该计划下所有用例的执行结果并落库为一条 Test_Report。
4. WHEN 用户点击某条报告查看详情, THE Report_Module SHALL 展示通过率、失败用例列表、阻塞用例列表、优先级分布以及关联缺陷（若有）。
5. WHEN 用户点击导出, THE Backend_Service SHALL 通过 `GET /api/v1/reports/{id}/export?format=pdf` 或 `format=excel` 返回对应二进制流，`Content-Type` 分别为 `application/pdf` 与 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`。
6. IF `format` 参数取值不属于 `pdf` 或 `excel`, THEN THE Backend_Service SHALL 返回 `code = 1001` 且 HTTP 状态码 `400`，并在 `message` 中说明合法取值。

### Requirement 12: 兼容旧路由与现有 SSE/DTO 契约

**User Story:** As a 现有前端用户与已对接后端的集成方, I want 升级后历史链接和已使用的 DTO 字段仍然可用, so that 我不需要在升级当天同步修改外部依赖。

#### Acceptance Criteria

1. WHEN 用户访问 `/cases?projectId=:id`, THE Frontend_App SHALL 重定向至 `/projects/:id/cases` 且保留 `:id` 取值。
2. WHEN 用户访问 `/?projectId=:id`, THE Frontend_App SHALL 重定向至 `/projects/:id/cases`。
3. THE SSE_Contract SHALL 保留现有事件名 `stage_started`、`stage_chunk`、`stage_done`、`generation_complete` 与每个事件的 `taskId` / `stage` / `sequence` / `timestamp` / `payload` 字段不变。
4. THE Backend_Service SHALL 保留 `GeneratedCaseDto`、`TestCaseDto`、`CreateGenerateTaskRequest` 现有字段；新字段 SHALL 通过新增的 Generation_Config 子对象承载，并 SHALL 全部为可空类型。
5. WHEN 客户端发送的 `CreateGenerateTaskRequest` 不携带 Generation_Config 子对象（即字段为 `null` 或缺省）, THE Backend_Service SHALL 按未升级前的逻辑处理并返回成功响应。
6. WHEN 客户端发送的 `CreateGenerateTaskRequest` 中 `attachments[]` 元素缺失 `attachmentId` 字段, THE Backend_Service SHALL 返回 `code = 1001` 且 HTTP 状态码 `400`，并在 `message` 中说明 "附件必须先通过 /attachments 接口上传后再引用 attachmentId"；本次升级**不再支持 base64 内嵌附件内容**。
7. THE Backend_Service SHALL 保持统一响应结构 `{ code, message, data, requestId }` 与现有错误码表不变。
8. THE Backend_Service SHALL 在所有新增数据库字段中使用 snake_case，并 SHALL 在所有 API 请求 / 响应字段中使用 camelCase。
9. WHILE 用户使用思维导图、知识库、摘要、Snapshot、集成、分享中任一已有功能, THE Frontend_App SHALL 在新 IA 下提供可访问入口（来自 Sidebar「系统设置」分组或用例管理思维导图视图），且功能行为 SHALL 与升级前保持一致。
10. WHILE 环境变量 `VITE_TREEIFY_API_MODE=mock`, THE Frontend_App SHALL 继续在新路由结构下使用本地 mock 数据，且 SHALL NOT 强制依赖未上线的真实后端接口。

### Requirement 13: 50MB 大附件直传与历史记录重放

**User Story:** As a 测试工程师, I want 上传最大 50MB 的需求文件而无需担心 JSON 超限, so that 我能直接喂入完整的 PRD / 设计文档而不是手动摘录。

#### Acceptance Criteria

1. WHEN 用户在用例生成页或参考用例区上传文件, THE Frontend_App SHALL 通过 `multipart/form-data` 调用 `POST /api/v1/projects/{id}/attachments` 直传文件，且 SHALL NOT 将文件 base64 嵌入 JSON 请求体。
2. THE Backend_Service SHALL 接受单文件大小不超过 Single_File_Limit (50MB)，并通过 Spring Boot 配置 `spring.servlet.multipart.max-file-size=50MB` 与 `spring.servlet.multipart.max-request-size=50MB` 显式声明上限。
3. IF 用户上传的单文件实际字节数严格大于 Single_File_Limit (50MB), THEN THE Backend_Service SHALL 返回 `code = 1001` 且 HTTP 状态码 `413`，并在 `message` 中说明 "单文件不能超过 50MB"；此响应 SHALL 仅用于文件超限场景，不复用于其他校验失败（如空文件、非法 MIME），后两类 SHALL 使用不同的 `code` 与 4xx 状态码。
4. WHEN 文件直传成功, THE Backend_Service SHALL 在响应 `data` 中返回 `attachmentId`、`fileName`、`size`、`contentType` 四个字段，前端 SHALL 使用 `attachmentId` 作为后续生成请求中 `attachments[].attachmentId` 与 `referenceCases[]` 的引用，而非内嵌文件内容。
5. THE Backend_Service SHALL 在 `treeify_generation_event` 表（或同等持久层）中保留每个生成任务的全量 SSE 事件序列。
6. WHEN 用户在 History_Drawer 中点击重放某历史任务, THE Backend_Service SHALL 通过 `GET /api/v1/generate/{taskId}/events` 返回该任务持久化的事件列表，且事件数据结构 SHALL 与 SSE_Contract 一致，可被前端按现有逻辑直接渲染。
7. THE Backend_Service SHALL 提供 `GET /api/v1/projects/{id}/generate/history` 接口，返回该项目最近 N 条生成任务的元信息（创建时间、模式、`taskKind`、状态、Critic 评分、输入摘要），供 History_Drawer 列表使用。

### Requirement 14: Excel 标准用例模板导出

**User Story:** As a 测试经理, I want 用一个固定模板导出标准用例 Excel, so that 我交付给业务方的 Excel 在表头、样式与字段顺序上是受控的。

#### Acceptance Criteria

1. WHEN 用户在用例生成结果或用例管理列表页选择导出格式 "标准用例 Excel", THE Frontend_App SHALL 调用 `POST /api/v1/cases/export/excel` 并发送当前项目 ID 与选中的用例 ID 集合（缺省为全部）。
2. THE Backend_Service SHALL 加载 `resources/templates/case_export.xlsx` 模板，并按模板表头映射用例字段（标题、前置条件、执行步骤、预期结果、优先级、标签、来源、执行状态、`granularity`、`platforms`、`scenarioTags` 等）。
3. THE Backend_Service SHALL 以 `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` 与 `Content-Disposition: attachment; filename="testing-platform-cases-{date}.xlsx"` 响应二进制流。
4. IF 模板文件 `resources/templates/case_export.xlsx` 不存在或解析失败, THEN THE Backend_Service SHALL 返回 `code = 4001` 且 HTTP 状态码 `500`，并在 `message` 中说明 "用例 Excel 模板缺失或损坏"。
5. WHEN 导出请求未提供任何用例 ID, THE Backend_Service SHALL 默认导出当前项目下所有用例。
6. THE Frontend_App SHALL 在 `frontend/src/utils/exportCases.ts` 中新增 `exportXlsx` 函数封装该后端调用；其余 JSON / CSV / Markdown 三种轻量导出 SHALL 继续在前端拼接，不走后端模板。

### Requirement 15: 数据库与 DTO 增量字段

**User Story:** As a 后端开发者, I want 把本次生成配置以增量字段方式落库, so that 我在不修改既有列的前提下扩展生成与回填能力。

#### Acceptance Criteria

1. THE Backend_Service SHALL 在 `treeify_generation_task` 表中新增一列 `config_json`（类型 `JSON` / `LONGTEXT`，可空），用于持久化整个 Generation_Config 子对象。
2. THE Backend_Service SHALL 在 `treeify_test_case` 表中新增三列：`granularity`（VARCHAR，取值 `S` / `M` / `L`，可空）、`platforms`（JSON 字符串数组，可空）、`scenario_tags`（JSON 字符串数组，可空）。
3. THE Backend_Service SHALL 通过 Flyway / SQL 迁移脚本添加这些列，且 SHALL NOT 修改任何既有列的名称、类型或约束。
4. WHEN 生成任务回填到 `treeify_test_case` 时, THE Backend_Service SHALL 把当时 Generation_Config 中的 `granularity`、`targetPlatforms`、`businessScenarios` 分别写入新增的 `granularity`、`platforms`、`scenario_tags` 列。
5. THE GeneratedCaseDto SHALL 新增可空字段 `granularity`、`platforms`（字符串数组）、`scenarioTags`（字符串数组），并 SHALL 在序列化为 JSON 时保留 camelCase 命名。
6. THE CreateGenerateTaskRequest SHALL 新增一个可空子对象字段 `generationConfig`，其结构包含 `taskKind` / `businessScenarios` / `dimensions` / `granularity` / `targetPlatforms` / `outputFormat` / `customPrompt` / `referenceCases`，且每个子字段都为可空。
7. WHEN 客户端旧版本未携带 `generationConfig` 子对象, THE Backend_Service SHALL 默认其为 `null` 并按 `taskKind = "cases"`、其余字段缺省的方式处理，从而保留与升级前一致的行为。

### Requirement 16: 任务可独立并行实现的可验收边界

**User Story:** As a 项目协作发起人, I want 每条需求都能独立分发给一名开发或一名 GPT 协作者实现, so that 我可以并行推进而不会互相阻塞。

#### Acceptance Criteria

1. WHERE 一条需求新增了前端路由或视图, THE Requirement SHALL 显式给出对应的路径段（如 `/projects/:projectId/dashboard`）以及该视图调用的后端接口路径。
2. WHERE 一条需求新增了后端接口, THE Requirement SHALL 显式给出 HTTP 方法、URL、关键请求字段与响应字段，并 SHALL 指明使用 camelCase。
3. WHERE 一条需求新增了数据库表或字段, THE Requirement SHALL 显式给出表名、字段名（snake_case）与可选取值集合。
4. WHEN 多条需求引用同一资源（例如 `Generation_Config` 子对象、`taskKind` 字段、`treeify_test_plan` 表）, THE Requirement Document SHALL 通过 Glossary 中的术语条目维护单一来源定义，并在各需求中以相同名称引用，避免出现别名漂移。
5. THE Requirement Document SHALL 保证任意一条 `Requirement N` 都可以在不读取其他需求实现细节的前提下被验证：验证者只需阅读本需求的 EARS 验收标准与 Glossary，即可写出可执行的测试或人工核对清单。
