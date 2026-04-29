# 真实 AI 生成联调验证报告

日期：2026-04-27
分支：`codex/backend-contracts`
负责人：后端帮手（AI Generation 联调）

## 1. 测试环境

| 项 | 值 |
|---|---|
| JDK | Java 25.0.2 (JBR) |
| Spring Boot | 4.0.5 |
| Generation mode | `auto`（因 OPENAI_API_KEY=test，实际 fallback mock） |
| 数据库 | H2 file: `./data/treeify` |
| 测试方式 | curl + SSE 订阅 |

## 2. 请求样例

### 2.1 Auto 模式

```bash
# 创建任务
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户登录功能，支持账号密码和手机验证码"}'

# 订阅 SSE（用返回的 taskId）
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream
```

### 2.2 Step 模式

```bash
# 创建 step 任务
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"step","input":"用户登录功能"}'

# 订阅 E1 SSE → E1 done (needConfirm=true) → stream 断开
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream

# 确认 E1 → 进入 E2
curl -X POST http://localhost:8080/api/v1/generate/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e1"}'

# 订阅 E2 SSE → E2 done (needConfirm=true) → stream 断开
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream

# 确认 E2 → 进入 E3
curl -X POST http://localhost:8080/api/v1/generate/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e2"}'

# 订阅 E3+Critic SSE → generation_complete
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream
```

## 3. SSE 事件序列

### 3.1 Auto 模式（完整 12 事件）

| seq | event | stage | needConfirm | payload 关键字段 |
|---|---|---|---|---|
| 1 | stage_started | e1 | — | `{stage:"e1"}` |
| 2 | stage_chunk | e1 | — | `{content:"正在解析需求..."}` |
| 3 | stage_done | e1 | **false** | `{result:{businessGoals, userActions, ...}}` |
| 4 | stage_started | e2 | — | `{stage:"e2"}` |
| 5 | stage_chunk | e2 | — | `{content:"正在拆分可测试对象..."}` |
| 6 | stage_done | e2 | **false** | `{result:[{name,type,dimensions,priority}]}` |
| 7 | stage_started | e3 | — | `{stage:"e3"}` |
| 8 | stage_chunk | e3 | — | `{content:"正在生成测试用例..."}` |
| 9 | stage_done | e3 | **false** | `{result:[GeneratedCaseDto]}` |
| 10 | stage_started | critic | — | `{stage:"critic"}` |
| 11 | stage_done | critic | **false** | `{result:{score:88,issues,retryCount:0}}` |
| 12 | generation_complete | null | — | `{criticScore:88, cases:[...]}` |

**验证结果**：12 个事件全部按序到达，auto 模式 E1/E2 `needConfirm=false`，自动跑完。

### 3.2 Step 模式（分阶段）

**E1 阶段（3 事件）**：
| seq | event | stage | needConfirm |
|---|---|---|---|
| 1 | stage_started | e1 | — |
| 2 | stage_chunk | e1 | — |
| 3 | stage_done | e1 | **true** ← 前端应停住 |

**任务状态**：`status=wait_confirm, currentStage=e1`

**confirm 后 E2 阶段（3 事件）**：
| seq | event | stage | needConfirm |
|---|---|---|---|
| 4 | stage_started | e2 | — |
| 5 | stage_chunk | e2 | — |
| 6 | stage_done | e2 | **true** ← 前端应停住 |

**任务状态**：`status=wait_confirm, currentStage=e2`

**confirm 后 E3+Critic+Complete（6 事件）**：
| seq | event | stage | needConfirm |
|---|---|---|---|
| 7-12 | 同 auto 模式后半段 | | false |

**最终任务状态**：`status=done, criticScore=88, completedAt=...`

**验证结果**：step 模式 E1 和 E2 `needConfirm=true` 正确停住；confirm 后继续下一阶段；序列号从 E1 的 1-3 连续到 E2 的 4-6 再到 E3 的 7-12。

### 3.3 Cancel 测试

E1 后调用 cancel → `status=canceled, completedAt=设置`

**验证结果**：cancel 正确终止任务。

### 3.4 数据持久化测试

重启服务器后：
- `GET /api/v1/projects` → 项目数据完整保留
- `GET /api/v1/projects/1/cases` → 3 条用例完整保留

**验证结果**：H2 文件数据库持久化正常。

### 3.5 wait_confirm 下重复订阅

在 `status=wait_confirm, currentStage=e1` 时再次订阅 SSE → 重放 E1 的 3 个事件。

**验证结果**：幂等重放正确，前端可安全重复订阅。

## 4. 修复文件

| 操作 | 文件 | 修复内容 |
|---|---|---|
| 修改 | `MockTreeifyService.java` | 修复 `extractCriticScore` NPE bug：`int fallback` → `Integer fallback`，null 时返回 0 |

这是唯一需要的 bug 修复。原有 `extractCriticScore(event, current.criticScore())` 会在 `criticScore` 为 null（任务刚创建时）时触发 NullPointerException，因为 `Integer → int` 自动拆箱会失败。

## 5. 验证结果汇总

| 验收项 | 结果 |
|---|---|
| `./mvnw -q -DskipTests compile` | ✅ 通过 |
| `OPENAI_API_KEY=test ./mvnw -q test` | ✅ Tests run: 1, Errors: 0 |
| Auto 模式 SSE | ✅ 12 事件按序、needConfirm=false、自动跑完 |
| Step 模式 E1 停住 | ✅ needConfirm=true、status=wait_confirm |
| Step 模式 confirm 继续 | ✅ E1→E2→E3 正确推进 |
| Cancel | ✅ status=canceled、completedAt 设置 |
| 数据持久化 | ✅ 重启后数据保留 |
| 接口响应格式 | ✅ `{code, data, message, requestId}` |
| mock fallback | ✅ OPENAI_API_KEY=test 时自动走 mock |

## 6. 风险与注意事项

| 风险 | 影响 | 建议 |
|---|---|---|
| **真实 AI 需有效 API key** | 当前环境 OPENAI_API_KEY=unset，无法测试真实 LLM 链路 | 需用户提供真实 API key 进行 AI 模式验证 |
| **Step 模式 E2/E3 缺少上一阶段上下文** | Step confirm 后 E2 只从 input 重新生成，未利用 E1 的 LLM 结果；E3 同理 | 后续迭代需在 DB/内存存储 E1/E2 result，confirm 后传入下一阶段 |
| **Auto 模式 LLM 前置延迟** | auto 模式需串行完成 4 次 LLM 调用后才返回首个 SSE 事件，首事件延迟可能 10-30s | 后续迭代改为真正的 streaming（逐 token 推送），而非一次性返回 |
| **wait_confirm 重放幂等性** | 在 wait_confirm 状态重复订阅会重放当前阶段事件，前端需处理重复消费 | 前端可通过 taskId + sequence 去重 |
| **Critic 重试循环未实现** | 当前 Critic 总是通过（score=88），不会触发 E3 重试 | 后续迭代增加 score<阈值时自动重试逻辑 |