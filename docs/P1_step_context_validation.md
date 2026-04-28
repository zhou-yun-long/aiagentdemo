# P1 Step 模式上下文传递验证报告

> 日期：2026-04-28
> 分支：`codex/backend-contracts`
> 目标：记录 step 模式完整 curl 验证流程，梳理 E1→E2→E3 结果传递链路，记录 auto 回归和 mock fallback 结果，梳理接口/实现缺口

---

## 1. Step 模式完整 curl 验证流程

### 1.1 前置准备

```bash
# 启动服务
OPENAI_API_KEY=test ./mvnw spring-boot:run

# 创建项目（如果尚未创建）
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"登录功能测试","description":"用户登录功能，支持账号密码和手机验证码"}'
# 响应 → 记下 projectId（假设为 1）
```

### 1.2 创建 step 生成任务

```bash
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"step","input":"用户登录功能，支持账号密码和手机验证码"}'

# 预期响应：
# { "code":0, "data":{ "taskId":"xxx", "mode":"step", "status":"pending", "currentStage":"e1", "streamUrl":"/api/v1/generate/xxx/stream" }, ... }
# → 记下 taskId
```

### 1.3 订阅 E1 SSE

```bash
TASK_ID=<从上一步获取>
curl -N http://localhost:8080/api/v1/generate/${TASK_ID}/stream

# 预期收到 3 个 SSE 事件：
# id:1  data:{ "event":"stage_started", "stage":"e1", "payload":{"stage":"e1"} }
# id:2  data:{ "event":"stage_chunk",  "stage":"e1", "payload":{"content":"正在解析..."} }
# id:3  data:{ "event":"stage_done",   "stage":"e1", "payload":{"needConfirm":true, "result":{...}} }
# → SSE 流断开，任务进入 wait_confirm 状态
```

**E1 result 示例（mock 模式）**：

```json
{
  "businessGoals": ["提升登录链路质量", "覆盖正常、异常和边界路径"],
  "userActions": ["输入账号密码", "提交登录"],
  "systemBehaviors": ["校验账号密码", "返回登录结果"],
  "constraints": ["密码长度 6-20 位", "错误信息需要明确"]
}
```

### 1.4 确认 E1 → 推进至 E2

```bash
curl -X POST http://localhost:8080/api/v1/generate/${TASK_ID}/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e1"}'

# 预期响应：
# { "code":0, "data":{ "taskId":"xxx", "status":"e2", "currentStage":"e2", "streamUrl":"/api/v1/generate/xxx/stream" }, ... }
```

### 1.5 订阅 E2 SSE

```bash
curl -N http://localhost:8080/api/v1/generate/${TASK_ID}/stream

# 预期收到 3 个 SSE 事件（sequence 从 4 开始）：
# id:4  data:{ "event":"stage_started", "stage":"e2", ... }
# id:5  data:{ "event":"stage_chunk",  "stage":"e2", "payload":{"content":"正在拆分..."} }
# id:6  data:{ "event":"stage_done",   "stage":"e2", "payload":{"needConfirm":true, "result":[...]} }
# → SSE 流断开，任务再次进入 wait_confirm 状态
```

**E2 result 示例（mock 模式）**：

```json
[
  {"name":"登录表单", "type":"ui", "dimensions":["输入校验","提交交互"], "priority":"P0"},
  {"name":"账号密码校验", "type":"function", "dimensions":["正常路径","异常路径"], "priority":"P0"},
  {"name":"登录后跳转", "type":"flow", "dimensions":["成功跳转","失败停留"], "priority":"P1"}
]
```

### 1.6 确认 E2 → 推进至 E3

```bash
curl -X POST http://localhost:8080/api/v1/generate/${TASK_ID}/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e2"}'

# 预期响应：
# { "code":0, "data":{ "taskId":"xxx", "status":"e3", "currentStage":"e3", ... }, ... }
```

### 1.7 订阅 E3 + Critic + Complete SSE

```bash
curl -N http://localhost:8080/api/v1/generate/${TASK_ID}/stream

# 预期收到 6 个 SSE 事件（sequence 从 7 开始）：
# id:7   stage_started   e3
# id:8   stage_chunk     e3  {"content":"正在生成..."}
# id:9   stage_done      e3  {"needConfirm":false, "result":[cases]}
# id:10  stage_started   critic
# id:11  stage_done      critic {"needConfirm":false, "result":{score:88,...}}
# id:12  generation_complete  {"criticScore":88, "cases":[...]}
```

### 1.8 验证最终任务状态

```bash
curl http://localhost:8080/api/v1/generate/${TASK_ID}

# 预期：{ "status":"done", "currentStage":null, "criticScore":88, "completedAt":"..." }
```

---

## 2. E1 result → E2、E2 result → E3 传递链路分析

### 2.1 当前实现中的数据流

#### Auto 模式（链路完整）

| 阶段 | Prompt 组装 | 前一阶段结果是否传入 |
|------|------------|-------------------|
| E1 | `e1Prompt(input)` | — |
| E2 | `e2Prompt(input, e1Result)` | e1Result 作为 "E1 分析结果" 拼入 prompt |
| E3 | `e3Prompt(input, e1Result, e2Result)` | e1Result + e2Result 分别拼入 prompt |
| Critic | `criticPrompt(input, cases)` | 生成的 cases 传入 |

**Auto 模式下 E1→E2→E3 阶段间上下文传递是完整的**，因为所有阶段在同一个 `buildAiAutoEvents()` 方法中串行执行，e1Result 和 e2Result 作为局部变量在内存中自然传递。

#### Step 模式（已补齐持久化链路）

| 阶段 | Prompt 组装 | 前一阶段结果是否传入 |
|------|------------|-------------------|
| E1 | `e1Prompt(input)` | — |
| E2 | `e2Prompt(input, e1Result)` + feedback | e1Result 从任务记录读取，feedback 作为补充约束 |
| E3 | `e3Prompt(input, e1Result, e2Result)` + feedback | e1Result + e2Result 从任务记录读取，feedback 作为补充约束 |
| Critic | `criticPrompt(input, cases)` | cases 传入（正常） |

**Step 模式阶段间上下文传递已补齐**：E1/E2 的 `stage_done.payload.result` 会写入任务记录，confirm 后下一阶段从 DB 读取前置结果拼入 prompt。

### 2.2 关键实现点

Step 模式的每个阶段是**独立调用**的（用户 confirm 后才触发下一阶段），因此后端需要持久化阶段结果：

1. `TreeifyGenerationTask` 持有 `e1Result`、`e2Result`、`feedback`
2. `MockTreeifyService.applyEvent()` 在 `STAGE_DONE` 时保存 E1/E2 result
3. `confirmTask()` 保存用户 feedback 并推进状态（`wait_confirm → e2/e3`）
4. `GenerateController.streamGenerateTask()` 将持久化结果传入 `TreeifyGenerationService.buildEvents()`
5. `AiTreeifyGenerationService` 在 E2/E3 prompt 中消费持久化 result 和 feedback

### 2.3 数据流示意图

```
Auto 模式（完整链路）：
  input → [E1 LLM] → e1Result ─┐
                                ├→ [E2 LLM] → e2Result ─┐
                                │                         ├→ [E3 LLM] → cases → [Critic] → score
                                │                         │
  input ────────────────────────┘                         ┘

Step 模式（已补齐链路）：
  input → [E1 LLM] → e1Result ─→ SSE payload.result
                                 ─→ DB e1Result 字段持久化 ✓

  confirm(stage="e1", feedback?) → status=e2, currentStage=e2
  input + e1Result + feedback ─→ [E2 LLM] → e2Result ─→ SSE payload.result
                                                        ─→ DB e2Result 字段持久化 ✓

  confirm(stage="e2", feedback?) → status=e3, currentStage=e3
  input + e1Result + e2Result + feedback ─→ [E3 LLM] → cases → [Critic] → score
```

### 2.4 Step 模式目标链路

```
Step 模式（完整链路）：
  input → [E1 LLM] → e1Result ─→ SSE payload.result
                                 ─→ DB e1_result 字段持久化 ✓

  confirm(stage="e1") → 读取 e1_result → 拼入 E2 prompt
  input + e1Result ─→ [E2 LLM] → e2Result ─→ SSE payload.result
                                        ─→ DB e2_result 字段持久化 ✓

  confirm(stage="e2") → 读取 e2_result → 拼入 E3 prompt
  input + e1Result + e2Result ─→ [E3 LLM] → cases → [Critic] → score
```

---

## 3. Auto 模式回归验证

### 3.1 回归测试 curl

```bash
# 创建 auto 任务
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户登录功能，支持账号密码和手机验证码"}'

# 记下 taskId，订阅 SSE
curl -N http://localhost:8080/api/v1/generate/${TASK_ID}/stream
```

### 3.2 预期事件序列

| seq | event | stage | needConfirm | payload 关键字段 |
|-----|-------|-------|-------------|----------------|
| 1 | stage_started | e1 | — | `{stage:"e1"}` |
| 2 | stage_chunk | e1 | — | `{content:"正在解析需求..."}` |
| 3 | stage_done | e1 | **false** | `{result:{businessGoals,...}}` |
| 4 | stage_started | e2 | — | `{stage:"e2"}` |
| 5 | stage_chunk | e2 | — | `{content:"正在拆分可测试对象..."}` |
| 6 | stage_done | e2 | **false** | `{result:[{name,type,...}]}` |
| 7 | stage_started | e3 | — | `{stage:"e3"}` |
| 8 | stage_chunk | e3 | — | `{content:"正在生成测试用例..."}` |
| 9 | stage_done | e3 | **false** | `{result:[GeneratedCaseDto]}` |
| 10 | stage_started | critic | — | `{stage:"critic"}` |
| 11 | stage_done | critic | **false** | `{result:{score:88,...}}` |
| 12 | generation_complete | null | — | `{criticScore:88, cases:[...]}` |

### 3.3 回归验证结果

| 验收项 | 结果 |
|--------|------|
| 12 事件全部按序到达 | ✅ |
| E1/E2 needConfirm=false（不停住） | ✅ |
| E2 prompt 包含 e1Result（mock 无验证，AI 模式代码已实现） | ✅ 代码层面 |
| E3 prompt 包含 e1Result + e2Result（mock 无验证，AI 模式代码已实现） | ✅ 代码层面 |
| 最终 status=done, criticScore=88 | ✅ |

**说明**：auto 模式回归不受 step 模式改动影响。auto 模式的事件序列和阶段间上下文传递在代码中已完整实现（`rebuildAutoEvents` 方法中 e1Result/e2Result 在局部变量间传递）。

---

## 4. Mock fallback 验证

### 4.1 fallback 触发条件

`AiTreeifyGenerationService` 在以下情况 fallback 到 `MockGenerationService`：

1. **`llmAvailable = false`**：`OPENAI_API_KEY` 为 null / 空白 / "test"
2. **AI 调用异常**：`buildAiEvents()` 抛出任何 Exception

当前开发环境 `OPENAI_API_KEY=test`，所以**始终走 mock fallback**。

### 4.2 Mock fallback 行为验证

| 验收项 | 结果 |
|--------|------|
| mock auto 模式 12 事件按序 | ✅ |
| mock step 模式 E1/E2 needConfirm=true | ✅ |
| mock step E1 confirm → status=e2 | ✅ |
| mock step E2 confirm → status=e3 | ✅ |
| mock step E3+Critic+Complete 正常完成 | ✅ |
| mock cancel → status=canceled | ✅ |
| mock 重启后数据持久化 | ✅ |
| mock wait_confirm 重放幂等 | ✅ |

### 4.3 Mock 模式下阶段间上下文传递

**Mock 模式不涉及阶段间上下文传递问题**——mock 数据是预硬编码的（`MockScenario` record），E2 和 E3 的 mock result 不依赖 E1 的结果内容。mock 的 `confirmTask()` 只改变状态，不拼入任何上下文。

这意味着：
- mock 模式下**无法验证** e1Result 是否正确传入 E2 prompt
- 要验证上下文传递链路，**必须使用真实 LLM 调用**
- 当前 mock fallback 是安全的，不会因上下文传递缺失而产生异常

---

## 5. 实现状态与剩余风险

### 5.1 核心能力状态

| # | 问题 | 严重程度 | 影响范围 | 当前状态 |
|---|------|---------|---------|---------|
| G1 | `TreeifyGenerationTask` 实体支持 `e1Result`/`e2Result`/`feedback` | **高** | step 模式 E2/E3 可读取前一阶段分析结果 | 已实现 |
| G2 | `GenerateTaskDto` 返回 `e1Result`/`e2Result`/`feedback` | **高** | API 可用于验证中间结果持久化 | 已实现 |
| G3 | `STAGE_DONE` 结果持久化 | **高** | E1/E2 SSE 完成后写入任务记录 | 已实现，`MockTreeifyService.applyEvent()` 写入 |
| G4 | E2 prompt 消费 E1 result | **高** | E2 LLM 调用带上 E1 结构化分析结果 | 已实现，解析失败时 fallback 到原始 input |
| G5 | E3 prompt 消费 E1+E2 result | **高** | E3 LLM 调用带上分析结果和对象拆分结果 | 已实现，支持 E2 JSON 数组 |
| G6 | Confirm feedback 被消费 | **中** | 用户修改意见进入下一阶段 prompt | 已实现，confirm 保存 feedback，E2/E3 prompt 拼接 feedback |

### 5.2 剩余风险与限制

| # | 问题 | 严重程度 | 说明 |
|---|------|---------|------|
| G7 | `generation_events` 未落库 | **低** | 当前仅持久化任务阶段结果，不持久化完整 SSE 事件流水 |
| G8 | step 模式 sequence 号硬编码（4, 7） | **低** | `buildAiStepE2Events` seq 从 4 开始，`buildAiFinalEvents` 从 7 开始；如果 wait_confirm 重放导致 sequence 不连续，前端可能处理异常 |
| G9 | mock 模式无法验证上下文传递逻辑 | **中** | MockScenario 是硬编码数据，E2/E3 mock 不依赖 E1 结果；要验证真实上下文传递需有效 API key |
| G10 | 真实 LLM 验证依赖 API key | **中** | 当前环境 `OPENAI_API_KEY=test`，只能验证持久化、状态流和 mock fallback |

### 5.3 P1-3 已实现改动汇总

本轮已完成以下改动：

| 改动 | 涉及文件 | 说明 |
|------|---------|------|
| 新增阶段结果字段 | `TreeifyGenerationTask.java` | 新增 `e1Result`、`e2Result`、`feedback` 字段 |
| DTO 扩展 | `GenerateTaskDto.java` | 新增 `e1Result`、`e2Result`、`feedback` 字段 |
| SSE result 持久化 | `MockTreeifyService.applyEvent()` | `STAGE_DONE` event 的 `payload.result` 写入对应 DB 字段 |
| E2 prompt 改为带上下文 | `AiTreeifyGenerationService.buildAiStepE2Events()` | 使用持久化的 `e1Result` 拼装 E2 prompt |
| E3 prompt 改为带上下文 | `AiTreeifyGenerationService.buildAiFinalEvents()` | 使用持久化的 `e1Result` + `e2Result` 拼装 E3 prompt |
| feedback 消费 | `AiTreeifyGenerationService` + `MockTreeifyService` | confirm 保存 feedback，下一阶段 prompt 拼入 feedback |
| stream 端点传 result | `GenerateController.streamGenerateTask()` | 将 `e1Result`、`e2Result`、`feedback` 传入 generation service |
| GenerationService 接口扩展 | `TreeifyGenerationService.buildEvents()` | 参数新增 `e1Result`、`e2Result`、`feedback` |

### 5.4 风险提示

| 风险 | 说明 |
|------|------|
| e1_result JSON 解析失败 | LLM 输出可能不是合法 JSON，需 fallback 到原始文本拼接 |
| 中间结果体积过大 | e1Result/e2Result 可能超过 DB 列长度限制或 LLM token 预算 |
| mock 场景限制 | MockGenerationService 为固定结果，无法证明真实 prompt 已被 LLM 消费 |
| 真实 LLM 验证依赖 API key | 当前环境 OPENAI_API_KEY=test，无法实际验证 E2 是否正确接收 E1 result |

---

## 6. 前端侧现状

### 6.1 前端已具备的能力

| 能力 | 文件 | 说明 |
|------|------|------|
| SSE 订阅与事件分派 | `useGenerateStream.ts` | `stage_done` 事件中的 `payload.result` 已存入 store |
| Confirm 请求 | `useGenerateStream.ts` → `confirmGenerateTask()` | 发送 `{stage: activeStage, feedback}` 到 confirm 端点 |
| Step 模式 SSE 断连/重连 | `useGenerateStream.ts` | `needConfirm=true` 时关闭 EventSource，confirm 后重连 |
| 阶段结果保留 | `generationStore.ts` | `confirmCurrentStage()` 不清除 result，保留前一阶段数据 |

### 6.2 前端侧状态

| # | 问题 | 说明 |
|---|------|------|
| F1 | Confirm 请求支持 feedback | `GeneratePanel.tsx` 在 E1/E2 wait_confirm 时展示 feedback textarea，并通过 `confirmCurrentStage(feedback)` 发送 |
| F2 | Confirm 后重新订阅 SSE | 保持原逻辑，后端从 DB 读取 e1/e2 result，不依赖前端回传 |

**注意**：F2 不应由前端解决——前端重新订阅 SSE 是 GET 请求（`/generate/{taskId}/stream`），无法携带 body。后端已从 DB 读取 e1Result/e2Result 拼入 prompt。

---

## 7. 验证结论

| 结论 | 说明 |
|------|------|
| step 模式 curl 流程正确 | E1→confirm→E2→confirm→E3+Critic+Complete 的 SSE 序列和状态转换均正确 |
| auto 模式不受影响 | auto 模式事件序列和阶段间传递完整，回归安全 |
| mock fallback 正常 | OPENAI_API_KEY=test 时自动走 mock，无异常 |
| step 模式上下文传递已补齐 | E1/E2 result 持久化，E2/E3 prompt 可读取前置结果 |
| feedback 链路已补齐 | E1/E2 confirm 的 feedback 会写入任务并拼入下一阶段 prompt |
| 剩余验证依赖真实 API key | mock fallback 能验证状态和持久化，但不能证明真实 LLM 消费了 prompt 上下文 |
