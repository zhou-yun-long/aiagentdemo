# speccase 前后端对接文档

> 本文档记录当前前端线程已实现的对接契约、运行模式、SSE 事件处理和用例回填流程。目标是让后端可用时前端自动走真实接口，后端不可用时继续使用 mock 演示。

## 0. 当前完成情况

更新时间：2026-04-26

当前分支：`codex/backend-contracts`

### 0.1 后端完成情况

| 模块 | 状态 | 说明 | 主要文件 |
| --- | --- | --- | --- |
| Maven Wrapper 配置 | 已完成 | 补齐 `.mvn/wrapper/maven-wrapper.properties`，可用 `./mvnw` 构建 | `.mvn/wrapper/maven-wrapper.properties` |
| 统一响应 | 已完成 | `/api/v1/**` 使用 `{ code, data, message, requestId }` | `src/main/java/com/zoujuexian/aiagentdemo/api/common/ApiResponse.java` |
| 错误码与异常处理 | 已完成 | 新增错误码、业务异常和 Treeify 控制器异常处理 | `api/common/ApiErrorCode.java`, `BusinessException.java`, `GlobalExceptionHandler.java` |
| 项目接口 | 已完成 mock 版 | 支持列表、创建、详情、更新、归档 | `api/controller/treeify/ProjectController.java` |
| 用例接口 | 已完成 mock 版 | 支持列表、统计、创建、更新、删除、执行状态、批量确认 | `api/controller/treeify/TestCaseController.java` |
| 生成任务接口 | 已完成 mock 版 | 支持创建任务、查询任务、SSE 流、确认、取消 | `api/controller/treeify/GenerateController.java` |
| 后端 DTO | 已完成 | 覆盖前端 `ProjectDto`、`TestCaseDto`、`GenerateTaskDto`、`GenerateSseEventDto` 等类型 | `api/controller/treeify/dto/` |
| 内存 mock 服务 | 已完成 | 内置示例项目、登录用例、生成用例、SSE 事件序列 | `service/treeify/MockTreeifyService.java` |

### 0.2 已验证结果

后端编译通过：

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' ./mvnw -q -DskipTests compile
```

Spring 上下文测试通过：

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' OPENAI_API_KEY=test ./mvnw -q test
```

说明：不设置 `OPENAI_API_KEY` 时，Spring AI 自动配置会因为 API key 为空导致测试上下文加载失败。当前 mock 接口不调用真实 LLM，但应用启动仍会初始化 Spring AI，因此测试和本地启动至少需要一个非空 dummy key。

本地接口已验证：

| 接口 | 验证状态 |
| --- | --- |
| `GET /api/v1/projects` | 通过 |
| `GET /api/v1/projects/1/cases` | 通过 |
| `GET /api/v1/projects/1/cases/stats` | 通过 |
| `POST /api/v1/projects/1/generate` | 通过 |
| `GET /api/v1/generate/{taskId}/stream` | 通过 |

SSE 输出已确认只包含默认 message 事件，不发送自定义 `event:` 行；前端可以继续使用 `eventSource.onmessage`，并从 `JSON.parse(message.data).event` 读取业务事件类型。

### 0.3 当前未完成

| 项目 | 状态 | 下一步 |
| --- | --- | --- |
| 数据库持久化 | 未开始 | 后续用 MySQL 替换 `MockTreeifyService` 内存数据 |
| 真实 E1/E2/E3/Critic 编排 | 未开始 | 后续新增 `OrchestrationService` 并接 Spring AI |
| 项目级 RAG/摘要 | 未开始 | 后续接 `project_summaries`、`knowledge_chunks` |
| 鉴权/权限 | 未开始 | P0 先默认单用户，P1 再接登录态 |
| OpenAPI 文档 | 未开始 | 建议下一步补接口样例或 OpenAPI |

## 1. 当前前端状态

前端已完成以下骨架：

| 能力 | 状态 | 主要文件 |
| --- | --- | --- |
| 工作台节点状态管理 | 已完成，本地可编辑、增删、移动、导出 | `frontend/src/features/workspace/workspaceStore.ts` |
| 生成任务状态管理 | 已完成，支持 E1/E2/E3/Critic 状态 | `frontend/src/features/generation/generationStore.ts` |
| mock SSE 生成流 | 已完成 | `frontend/src/features/generation/useGenerateStream.ts` |
| 真实 API 接口封装 | 已完成 | `frontend/src/shared/api/treeify.ts` |
| 后端 DTO 类型 | 已完成 | `frontend/src/shared/types/treeify.ts` |
| DTO 转换层 | 已完成 | `frontend/src/shared/transforms/treeifyTransforms.ts` |
| 生成面板与候选用例预览 | 已完成 | `frontend/src/components/GeneratePanel.tsx`, `frontend/src/components/CasePreviewTable.tsx` |

## 2. 前端运行模式

前端通过 Vite 环境变量控制接口来源：

```bash
VITE_TREEIFY_API_MODE=auto
VITE_TREEIFY_PROJECT_ID=1
```

| 变量 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `VITE_TREEIFY_API_MODE` | `auto` / `mock` / `real` | `auto` | `auto` 先尝试真实后端，失败回落 mock；`real` 强制真实后端；`mock` 强制本地 mock |
| `VITE_TREEIFY_PROJECT_ID` | 正整数 | `1` | 创建生成任务和批量确认用例时使用的项目 ID |

Vite 已配置代理：

```ts
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

联调时：

1. 前端访问 `http://127.0.0.1:5173/`
2. 后端启动在 `http://localhost:8080`
3. 前端请求 `/api/v1/**` 由 Vite 代理到后端

## 3. 统一响应格式

前端 `request<T>()` 按以下结构解析：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req-xxx"
}
```

要求：

| 字段 | 要求 |
| --- | --- |
| `code` | 成功必须为 `0` |
| `message` | 失败时用于前端错误提示 |
| `data` | 业务数据 |
| `requestId` | 可选，但建议返回，便于排查 |

前端文件：`frontend/src/shared/api/request.ts`

## 4. 项目接口

### GET `/api/v1/projects`

用途：获取项目列表。

前端类型：

```ts
type ProjectDto = {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
```

### GET `/api/v1/projects/{projectId}`

用途：获取项目详情。

### 后续待接入

当前前端生成链路已经会使用 `VITE_TREEIFY_PROJECT_ID`，但工作台启动时还未自动加载项目和用例。下一步建议接：

1. 启动时 `GET /api/v1/projects`
2. 选择第一个 active 项目
3. 拉取 `GET /api/v1/projects/{projectId}/cases`
4. 用 `testCasesToMindNodes()` 转为画布节点

## 5. 用例接口

### GET `/api/v1/projects/{projectId}/cases`

用途：获取项目下测试用例。

前端类型：

```ts
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
```

### GET `/api/v1/projects/{projectId}/cases/stats`

用途：获取用例统计。当前前端暂时按本地节点计算统计，后续可切换到该接口。

### POST `/api/v1/cases/batch-confirm`

用途：生成候选用例确认后保存到后端。

Request：

```json
{
  "projectId": 1,
  "cases": [
    {
      "title": "正确账号密码登录成功",
      "precondition": "用户已注册合法账号，系统处于正常运行状态",
      "steps": ["打开登录页面", "输入正确的用户名和密码", "点击登录按钮"],
      "expected": "登录成功并跳转首页",
      "priority": "P0",
      "tags": ["Web", "AI"],
      "source": "ai",
      "pathType": "happy"
    }
  ]
}
```

Response：`TestCaseDto[]`

前端行为：

| 模式 | 行为 |
| --- | --- |
| `real` | 调用 `/api/v1/cases/batch-confirm`，成功后把返回的 `TestCaseDto[]` 转成画布节点 |
| `auto` | 如果真实接口失败，前端会本地回填候选用例 |
| `mock` | 直接本地回填 |

转换函数：

| 函数 | 文件 | 说明 |
| --- | --- | --- |
| `draftToGeneratedCaseDto` | `frontend/src/shared/transforms/treeifyTransforms.ts` | 前端候选草稿转后端 `GeneratedCaseDto` |
| `testCasesToRows` | 同上 | 后端保存结果转画布回填 rows |
| `testCasesToMindNodes` | 同上 | 后端用例转思维导图节点，下一步项目加载会使用 |

## 6. 生成任务接口

### POST `/api/v1/projects/{projectId}/generate`

用途：创建生成任务。

Request：

```json
{
  "mode": "auto",
  "input": "用户需要支持手机号登录...",
  "prdDocumentId": null,
  "contextCaseIds": [],
  "selectedNodeId": "success-steps"
}
```

当前前端实际发送：

```json
{
  "mode": "auto",
  "input": "用户输入的需求文本"
}
```

Response：

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

### GET `/api/v1/generate/{taskId}/stream`

用途：SSE 订阅生成过程。

前端使用：

```ts
const eventSource = new EventSource(task.streamUrl);
eventSource.onmessage = (message) => {
  const event = JSON.parse(message.data);
};
```

后端需要保证每条 SSE 的 `data` 是完整 JSON：

```text
data: {"event":"stage_chunk","taskId":"...","stage":"e1","sequence":2,"timestamp":"...","payload":{"content":"..."}}
```

### POST `/api/v1/generate/{taskId}/confirm`

用途：逐步模式下确认当前阶段继续。

Request：

```json
{
  "stage": "e1",
  "feedback": "可选修改意见"
}
```

当前前端会发送当前 `activeStage`。

### POST `/api/v1/generate/{taskId}/cancel`

用途：取消生成任务。

## 7. SSE 事件契约

前端支持 4 类事件：

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

### `stage_started`

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

前端行为：对应阶段进入 running。

### `stage_chunk`

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

前端行为：把 `payload.content` 追加到当前阶段流式输出。

### `stage_done`

```json
{
  "event": "stage_done",
  "taskId": "uuid",
  "stage": "e1",
  "sequence": 3,
  "timestamp": "2026-04-25T10:00:02",
  "payload": {
    "needConfirm": true,
    "result": {
      "businessGoals": ["提升登录链路质量"]
    }
  }
}
```

前端行为：

| `payload.needConfirm` | 行为 |
| --- | --- |
| `true` | 任务状态变为 `waiting_confirm`，等待用户点击“继续下一阶段” |
| `false` | 阶段完成，继续消费后续 SSE |

`payload.result` 可以是字符串、数组或对象；前端会 `JSON.stringify(result, null, 2)` 展示。

### `generation_complete`

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
        "tags": ["Web", "AI"],
        "source": "ai",
        "pathType": "happy"
      }
    ]
  }
}
```

前端行为：

1. 关闭 SSE
2. 标记任务为 `done`
3. 展示 Critic 分数
4. 将 `payload.cases` 转为候选用例表
5. 用户点击“确认回填”后保存/回填到思维导图

## 8. 前端生成流程

```text
用户输入需求
  -> 点击启动生成
  -> auto 模式尝试 POST /api/v1/projects/{projectId}/generate
    -> 成功：EventSource 订阅 streamUrl
    -> 失败：回落本地 mock 流
  -> 展示 E1/E2/E3/Critic 流式过程
  -> generation_complete 后展示候选用例
  -> 用户编辑候选用例
  -> 点击确认回填
    -> real：POST /api/v1/cases/batch-confirm
    -> mock/fallback：本地回填
  -> 思维导图新增用例节点
```

## 9. 联调检查清单

### 后端本地启动

当前机器可使用 IntelliJ 内置 JDK 运行后端：

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=test \
./mvnw spring-boot:run
```

如需指定端口：

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=test \
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=18080
```

`OPENAI_API_KEY=test` 只用于 mock 接口和 Spring 上下文启动验证；真实 AI 编排接入后需要替换为真实密钥。

### 后端启动检查

```bash
curl http://localhost:8080/api/v1/projects
```

期望：返回统一响应 `{ code: 0, data: [...] }`

### 前端代理检查

```bash
curl http://127.0.0.1:5173/api/v1/projects
```

期望：能通过 Vite 代理拿到后端响应。

### 生成任务检查

```bash
curl -X POST http://127.0.0.1:5173/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户需要支持手机号登录"}'
```

期望：返回 `taskId` 和 `streamUrl`。

### SSE 检查

```bash
curl -N http://127.0.0.1:5173/api/v1/generate/{taskId}/stream
```

期望：持续输出 `data: {...}`。

后端直连验证也可使用：

```bash
curl -N http://127.0.0.1:8080/api/v1/generate/{taskId}/stream
```

当前后端 SSE 输出形态：

```text
id:1
data:{"event":"stage_started","taskId":"...","stage":"e1","sequence":1,"timestamp":"...","payload":{"stage":"e1"}}
```

注意：不要依赖 SSE 协议层的 `event:` 行；业务事件类型统一读取 `data.event`。

## 10. 已知限制与下一步

当前限制：

1. 工作台启动时还没有自动加载 `/projects` 和 `/cases`。
2. 顶部统计仍基于前端节点计算，没有使用 `/cases/stats`。
3. 节点编辑、删除、执行状态更新还没有持久化到后端。
4. `selectedNodeId`、`contextCaseIds` 暂未接入生成请求。

建议下一步：

1. 页面初始化接入 `GET /api/v1/projects` 和 `GET /api/v1/projects/{projectId}/cases`。
2. 用 `testCasesToMindNodes()` 将后端用例渲染为思维导图。
3. 节点编辑后调用 `PUT /api/v1/cases/{caseId}`。
4. 执行状态变更后调用 `PATCH /api/v1/cases/{caseId}/execution-status`。
5. 用 `selectedNodeId` 和 `contextCaseIds` 把当前选区上下文传给生成接口。
