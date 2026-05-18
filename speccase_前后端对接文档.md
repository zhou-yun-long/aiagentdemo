# 测试平台对接文档

> 本文档记录测试平台前后端的 REST API 契约、SSE 事件格式和附件上传流程。所有接口路径以 `/api/v1` 为前缀。

## 1. 统一响应格式

所有接口返回统一 JSON 结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req-xxx"
}
```

| 字段 | 要求 |
| --- | --- |
| `code` | 成功必须为 `0`，非 0 表示业务错误 |
| `message` | 失败时用于前端错误提示 |
| `data` | 业务数据，类型由具体接口定义 |
| `requestId` | 请求追踪 ID，便于排查 |

前端请求封装：`frontend/src/shared/api/request.ts`

## 2. 前端运行模式

前端通过 Vite 环境变量控制接口来源：

```bash
VITE_TREEIFY_API_MODE=auto
VITE_TREEIFY_PROJECT_ID=1
```

| 变量 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `VITE_TREEIFY_API_MODE` | `auto` / `mock` / `real` | `auto` | `auto` 先尝试真实后端，失败回落 mock；`real` 强制真实后端；`mock` 强制本地 mock |
| `VITE_TREEIFY_PROJECT_ID` | 正整数 | `1` | 前端默认使用的项目 ID |

联调时前端运行在 `http://localhost:5173`，后端运行在 `http://localhost:8080`，Vite 代理将 `/api/` 转发到后端。

## 3. 项目接口

### 3.1 项目 CRUD

**GET `/api/v1/projects`** — 项目列表

Response：`ProjectDto[]`

**POST `/api/v1/projects`** — 创建项目

```json
{ "name": "项目名称", "description": "项目描述" }
```

Response：`ProjectDto`（HTTP 201）

**GET `/api/v1/projects/{projectId}`** — 项目详情

Response：`ProjectDto`

**PUT `/api/v1/projects/{projectId}`** — 更新项目

```json
{ "name": "新名称", "description": "新描述" }
```

Response：`ProjectDto`

**DELETE `/api/v1/projects/{projectId}`** — 归档项目

Response：`ProjectDto`

**PATCH `/api/v1/projects/{projectId}/restore`** — 恢复已归档项目

Response：`ProjectDto`

### 3.2 需求追溯图

**GET `/api/v1/projects/{projectId}/traceability`** — 获取追溯图

Response：`TraceGraphDto`

**PUT `/api/v1/projects/{projectId}/traceability`** — 保存追溯图

Request Body：`TraceGraphDto`
Response：`TraceGraphDto`

### 3.3 项目分享

**POST `/api/v1/projects/{projectId}/share`** — 创建分享链接

Response：`ShareDto`（HTTP 201）

**GET `/api/v1/projects/{projectId}/share`** — 获取分享信息

Response：`ShareDto`

**DELETE `/api/v1/projects/{projectId}/share`** — 撤销分享

Response：`null`

**GET `/api/v1/share/{token}`** — 通过 token 访问分享数据（无需鉴权）

Response：`ShareDataDto`

## 4. 用例接口

### 4.1 用例 CRUD

**GET `/api/v1/projects/{projectId}/cases`** — 项目用例列表

Response：`TestCaseDto[]`

**GET `/api/v1/projects/{projectId}/cases/stats`** — 单项目用例统计

Response：`CaseStatsDto`

**GET `/api/v1/projects/cases/stats`** — 所有项目用例统计

Response：`Map<projectId, CaseStatsDto>`

**POST `/api/v1/projects/{projectId}/cases`** — 创建用例

```json
{
  "title": "用例标题",
  "precondition": "前置条件",
  "steps": ["步骤1", "步骤2"],
  "expected": "预期结果",
  "priority": "P0",
  "tags": ["Web"],
  "parentId": null
}
```

Response：`TestCaseDto`（HTTP 201）

**PUT `/api/v1/cases/{caseId}`** — 更新用例

Request Body：同创建
Response：`TestCaseDto`

**DELETE `/api/v1/cases/{caseId}`** — 删除用例

```json
{ "deleted": true, "caseId": 123 }
```

**PATCH `/api/v1/cases/{caseId}/execution-status`** — 更新执行状态

```json
{ "executionStatus": "passed" }
```

可选值：`not_run` / `running` / `passed` / `failed` / `blocked` / `skipped`

Response：`TestCaseDto`

### 4.2 批量确认

**POST `/api/v1/cases/batch-confirm`** — 批量确认 AI 生成的候选用例

```json
{
  "projectId": 1,
  "cases": [
    {
      "title": "正确账号密码登录成功",
      "precondition": "用户已注册合法账号",
      "steps": ["打开登录页面", "输入正确账号密码", "点击登录按钮"],
      "expected": "登录成功并跳转首页",
      "priority": "P0",
      "tags": ["Web"],
      "source": "ai",
      "pathType": "happy"
    }
  ]
}
```

Response：`TestCaseDto[]`

### 4.3 思维导图

**GET `/api/v1/projects/{projectId}/mindmap`** — 获取思维导图节点

Response：`MindmapNodeDto[]`

**PUT `/api/v1/projects/{projectId}/mindmap`** — 保存思维导图节点

Request Body：`SaveMindmapRequest`
Response：`MindmapNodeDto[]`

### 4.4 用例导出

**GET `/api/v1/projects/{projectId}/export/excel`** — 导出 Excel

Response：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`（二进制下载）

## 5. 用例生成接口

### 5.1 任务管理

**POST `/api/v1/projects/{projectId}/generate`** — 创建生成任务

```json
{
  "mode": "auto",
  "input": "用户需要支持手机号登录...",
  "prdDocumentId": null,
  "contextCaseIds": [],
  "selectedNodeId": "success-steps"
}
```

Response（HTTP 202）：

```json
{
  "taskId": "uuid",
  "projectId": 1,
  "mode": "auto",
  "status": "pending",
  "currentStage": null,
  "streamUrl": "/api/v1/generate/{taskId}/stream",
  "criticScore": null,
  "createdAt": "2026-04-25T10:00:00",
  "updatedAt": "2026-04-25T10:00:00",
  "completedAt": null
}
```

**GET `/api/v1/projects/{projectId}/generate/history`** — 生成历史

Response：`GenerateHistoryDto[]`

**GET `/api/v1/generate/{taskId}`** — 查询任务状态

Response：`GenerateTaskDto`

**POST `/api/v1/generate/{taskId}/confirm`** — 确认当前阶段继续

```json
{ "stage": "e1", "feedback": "可选修改意见" }
```

Response：`GenerateTaskDto`

**POST `/api/v1/generate/{taskId}/cancel`** — 取消生成任务

Response：`GenerateTaskDto`

**GET `/api/v1/generation/dimensions`** — 获取生成维度配置

Response：`DimensionsDto`

### 5.2 SSE 事件流

**GET `/api/v1/generate/{taskId}/stream`** — SSE 订阅生成过程

Content-Type: `text/event-stream`

前端使用方式：

```ts
const eventSource = new EventSource(task.streamUrl);
eventSource.onmessage = (message) => {
  const event = JSON.parse(message.data);
  // event.event: 业务事件类型
  // event.stage: 当前阶段
  // event.payload: 事件数据
};
```

SSE 数据格式：

```
id:1
data:{"event":"stage_started","taskId":"...","stage":"e1","sequence":1,"timestamp":"...","payload":{"stage":"e1"}}
```

注意：不要依赖 SSE 协议层的 `event:` 行；业务事件类型统一从 `data.event` 读取。

### 5.3 事件重放

**GET `/api/v1/generate/{taskId}/events`** — 获取持久化的事件记录

Response：`TreeifyGenerationEvent[]`

### 5.4 SSE 事件类型

所有事件遵循以下结构：

```ts
type GenerateSseEventDto = {
  event: 'stage_started' | 'stage_chunk' | 'stage_done' | 'generation_complete';
  taskId: string;
  stage: 'e1' | 'e2' | 'e3' | 'critic' | null;
  sequence: number;
  timestamp: string;
  payload: Record<string, unknown>;
};
```

**`stage_started`** — 阶段开始

```json
{
  "event": "stage_started",
  "taskId": "uuid",
  "stage": "e1",
  "sequence": 1,
  "timestamp": "2026-04-25T10:00:00",
  "payload": { "stage": "e1" }
}
```

前端行为：对应阶段进入 running 状态。

**`stage_chunk`** — 阶段流式输出

```json
{
  "event": "stage_chunk",
  "taskId": "uuid",
  "stage": "e1",
  "sequence": 2,
  "timestamp": "2026-04-25T10:00:01",
  "payload": { "content": "正在解析需求..." }
}
```

前端行为：将 `payload.content` 追加到当前阶段流式输出区域。

**`stage_done`** — 阶段完成

```json
{
  "event": "stage_done",
  "taskId": "uuid",
  "stage": "e1",
  "sequence": 3,
  "timestamp": "2026-04-25T10:00:02",
  "payload": {
    "needConfirm": true,
    "result": { "businessGoals": ["提升登录链路质量"] }
  }
}
```

| `payload.needConfirm` | 前端行为 |
| --- | --- |
| `true` | 任务状态变为 `waiting_confirm`，等待用户点击"继续下一阶段" |
| `false` | 阶段完成，继续消费后续 SSE |

**`generation_complete`** — 生成完成

```json
{
  "event": "generation_complete",
  "taskId": "uuid",
  "stage": null,
  "sequence": 12,
  "timestamp": "2026-04-25T10:00:08",
  "payload": {
    "criticScore": 88,
    "cases": [
      {
        "title": "正确账号密码登录成功",
        "precondition": "用户已注册合法账号",
        "steps": ["打开登录页面", "输入正确账号密码", "点击登录按钮"],
        "expected": "登录成功并跳转首页",
        "priority": "P0",
        "tags": ["Web"],
        "source": "ai",
        "pathType": "happy"
      }
    ]
  }
}
```

前端行为：关闭 SSE → 标记任务为 `done` → 展示 Critic 分数 → 将 `payload.cases` 转为候选用例表 → 用户确认后批量保存。

## 6. 测试计划接口

**POST `/api/v1/plans`** — 创建测试计划

```json
{
  "projectId": 1,
  "name": "v1.0 回归测试",
  "description": "核心功能回归",
  "caseIds": [1, 2, 3]
}
```

Response：`TestPlanDto`（HTTP 201）

**GET `/api/v1/projects/{projectId}/plans`** — 项目计划列表

Response：`TestPlanDto[]`

**GET `/api/v1/plans/{planId}`** — 计划详情（含关联用例）

Response：`PlanDetailDto`

**PUT `/api/v1/plans/{planId}`** — 更新计划

Request Body：同创建
Response：`TestPlanDto`

**DELETE `/api/v1/plans/{planId}`** — 删除计划

Response：`null`

**PUT `/api/v1/plans/{planId}/cases/{caseId}/result`** — 更新用例执行结果

```json
{
  "executionResult": "passed",
  "note": "备注"
}
```

可选值：`not_run` / `passed` / `failed` / `blocked` / `skipped`

Response：`PlanCaseDto`

**POST `/api/v1/plans/{planId}/recompute`** — 重算计划状态

Response：`TestPlanDto`

## 7. 测试报告接口

**POST `/api/v1/plans/{planId}/reports?projectId={projectId}`** — 生成报告

Response：`TestReportDto`（HTTP 201）

**GET `/api/v1/projects/{projectId}/reports`** — 项目报告列表

Response：`TestReportDto[]`

**GET `/api/v1/reports/{reportId}`** — 报告详情

Response：`TestReportDto`

**GET `/api/v1/reports/{reportId}/summary`** — 报告汇总统计

Response：`ReportSummaryDto`

**GET `/api/v1/reports/{reportId}/failed-cases`** — 失败用例列表

Response：`FailedCaseDto[]`

**GET `/api/v1/reports/{reportId}/export?format=excel|pdf`** — 导出报告

Response：二进制文件下载（Excel 或 PDF）

## 8. Dashboard 接口

**GET `/api/v1/projects/{projectId}/dashboard`** — 项目数据看板

Response：`DashboardDto`

## 9. 附件上传

**POST `/api/v1/projects/{projectId}/attachments`** — 上传附件

Content-Type: `multipart/form-data`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | MultipartFile | 是 | 上传的文件，单文件限制 50MB |
| `purpose` | String | 否 | 附件用途，默认 `requirement` |

Response：`AttachmentDto`

配置：

```
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=55MB
```

## 10. 知识库接口

**POST `/api/v1/projects/{projectId}/knowledge`** — 添加知识文档

```json
{ "title": "文档标题", "content": "文档内容" }
```

Response：`KnowledgeDocumentDto`

**GET `/api/v1/projects/{projectId}/knowledge`** — 知识文档列表

Response：`KnowledgeDocumentDto[]`

**DELETE `/api/v1/knowledge/{documentId}`** — 删除知识文档

Response：`null`

**POST `/api/v1/projects/{projectId}/knowledge/search`** — 搜索知识文档

参数：`keyword`（必填）、`limit`（默认 5）
Response：`KnowledgeDocumentDto[]`

## 11. 项目摘要接口

**GET `/api/v1/projects/{projectId}/summary`** — 当前摘要

Response：`ProjectSummaryDto`

**GET `/api/v1/projects/{projectId}/summary/history`** — 摘要历史版本

Response：`ProjectSummaryDto[]`

**POST `/api/v1/projects/{projectId}/summary/generate`** — 生成摘要

参数：`context`（可选 query param）
Response：`ProjectSummaryDto`

**POST `/api/v1/projects/{projectId}/summary/rollback/{version}`** — 回滚摘要

Response：`ProjectSummaryDto`

## 12. 快照接口

**GET `/api/v1/projects/{projectId}/snapshots`** — 快照列表

Response：`SnapshotDto[]`

**POST `/api/v1/projects/{projectId}/snapshots`** — 创建快照

Request Body（可选）：`CreateSnapshotRequest`
Response：`SnapshotDto`（HTTP 201）

**GET `/api/v1/snapshots/{snapshotId}`** — 快照详情

Response：`SnapshotDto`

**DELETE `/api/v1/snapshots/{snapshotId}`** — 删除快照

Response：`null`

## 13. 核心 DTO 类型

```ts
type ProjectDto = {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type TestCaseDto = {
  id: number;
  projectId: number;
  parentId?: number | null;
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  source: string;
  executionStatus: 'not_run' | 'running' | 'passed' | 'failed' | 'blocked' | 'skipped';
  layout?: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type GenerateTaskDto = {
  taskId: string;
  projectId: number;
  mode: string;
  status: string;
  currentStage: string | null;
  streamUrl: string;
  criticScore: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
```

## 14. 联调检查清单

### 后端启动

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
OPENAI_API_KEY=test \
./mvnw spring-boot:run
```

### 验证接口

```bash
# 项目列表
curl http://localhost:8080/api/v1/projects

# 创建生成任务
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户需要支持手机号登录"}'

# SSE 流
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream

# 测试计划
curl http://localhost:8080/api/v1/projects/1/plans

# 测试报告
curl http://localhost:8080/api/v1/projects/1/reports

# Dashboard
curl http://localhost:8080/api/v1/projects/1/dashboard
```
