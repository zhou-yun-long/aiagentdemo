# 真实 AI 生成服务 — 协作开发汇报

更新时间：2026-04-27
分支：`codex/backend-contracts`
负责人：后端帮手（AI Generation 模块）

## 1. 本次完成的工作

### 1.1 抽象 `TreeifyGenerationService` 接口

**文件**：`service/treeify/TreeifyGenerationService.java`

```java
public interface TreeifyGenerationService {
    List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage);
}
```

所有生成服务（mock / AI）统一实现此接口，Controller 通过接口注入，不绑定具体实现。

### 1.2 `MockGenerationService` 实现

**文件**：`service/treeify/MockGenerationService.java`

将 `MockTreeifyService` 中原有的 SSE 事件构建逻辑提取为独立 `MockGenerationService`，实现 `TreeifyGenerationService` 接口。同时新增 `defaultCases()` 公开方法，供 AI 服务在 LLM 解析失败时作为 fallback。

### 1.3 新增 `AiTreeifyGenerationService`

**文件**：`service/treeify/AiTreeifyGenerationService.java`

真实 AI 生成服务，核心特性：

| 特性 | 说明 |
|---|---|
| E1 阶段 | 调用 ChatClient，提取业务目标、用户动作、系统行为、约束条件 |
| E2 阶段 | 基于需求+E1结果，拆分可测试对象（ui/function/flow/data） |
| E3 阶段 | 基于需求+E1+E2，生成 `GeneratedCaseDto[]`（happy/error/boundary/alternative） |
| Critic 阶段 | 评审用例质量，返回评分和问题列表 |
| LLM 不可用 | 自动 fallback 到 `MockGenerationService`，保证即使 `OPENAI_API_KEY=test` 也能正常演示 |
| LLM 调用失败 | 逐阶段 try-catch，失败自动回退 mock，不中断用户流程 |
| JSON 解析 | 自动剥离 markdown 代码块包裹（```json ... ```），兼容主流 LLM 输出格式 |

### 1.4 生成模式配置

**文件**：`service/treeify/TreeifyGenerationConfig.java` + `application.properties`

新增配置项 `treeify.generation.mode`，支持三种模式：

| 值 | 行为 |
|---|---|
| `mock` | 强制使用模板生成，不调用 LLM |
| `ai` | 强制使用 AI 生成，LLM 不可用时内部 fallback |
| `auto`（默认） | 检测 `OPENAI_API_KEY` 是否有效：有效用 AI，无效用 mock |

```properties
treeify.generation.mode=${TREEIFY_GENERATION_MODE:auto}
```

### 1.5 重构 `GenerateController`

**文件**：`api/controller/treeify/GenerateController.java`

- 新增 `TreeifyGenerationService` 注入
- SSE stream 端点改为调用 `generationService.buildEvents()` 而非 `treeifyService.buildMockGenerateEvents()`
- 任务 CRUD 仍通过 `MockTreeifyService`（持久化到 H2）

### 1.6 增强 `MockTreeifyService`

**文件**：`service/treeify/MockTreeifyService.java`

- 新增 `getTaskInput(taskId)` 公开方法，供 Controller 获取任务输入文本
- `applyEvent()` 方法改为从 SSE event payload 中提取 `criticScore`，不再硬编码 88，兼容 AI 生成的不同分数

## 2. 修改文件清单

| 操作 | 文件 |
|---|---|
| 新建 | `service/treeify/TreeifyGenerationService.java` |
| 新建 | `service/treeify/MockGenerationService.java` |
| 新建 | `service/treeify/AiTreeifyGenerationService.java` |
| 新建 | `service/treeify/TreeifyGenerationConfig.java` |
| 修改 | `service/treeify/MockTreeifyService.java` |
| 修改 | `api/controller/treeify/GenerateController.java` |
| 修改 | `src/main/resources/application.properties` |

## 3. 验证结果

### 3.1 编译

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' ./mvnw -q -DskipTests compile
# ✅ 通过
```

### 3.2 测试

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' OPENAI_API_KEY=test ./mvnw -q test
# ✅ Tests run: 1, Failures: 0, Errors: 0
```

### 3.3 auto 模式下 mock fallback 验证

`OPENAI_API_KEY=test` 时，`AiTreeifyGenerationService` 检测到 API key 无效，自动 fallback 到 `MockGenerationService`，行为与改造前完全一致。

### 3.4 接口兼容性

- `POST /api/v1/projects/{projectId}/generate` — 无变化
- `GET /api/v1/generate/{taskId}/stream` — SSE 事件格式不变（stage_started/stage_chunk/stage_done/generation_complete）
- `POST /api/v1/generate/{taskId}/confirm` — 无变化
- `POST /api/v1/generate/{taskId}/cancel` — 无变化
- 所有响应仍为 `{ code, data, message, requestId }`

## 4. 如何启动验证

### 4.1 Mock 模式（无需真实 API key）

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=test \
./mvnw spring-boot:run
```

### 4.2 AI 模式（需要有效 API key）

```bash
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=你的真实key \
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 \
./mvnw spring-boot:run
```

### 4.3 验证步骤

```bash
# 1. 创建生成任务
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户需要支持手机号登录"}'

# 2. 订阅 SSE（用返回的 taskId 替换）
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream

# 3. Step 模式测试
curl -X POST http://localhost:8080/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"step","input":"用户登录功能"}'
# → E1 done 后 SSE 停止
curl -X POST http://localhost:8080/api/v1/generate/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e1"}'
# → 再次订阅 SSE 继续到 E2
curl -N http://localhost:8080/api/v1/generate/{taskId}/stream
```

## 5. 未完成 / 后续工作

| 项目 | 说明 | 优先级 |
|---|---|---|
| E1→E2→E3 链式上下文传递 | 当前 step 模式 E2/E3 只从原始 input 重新生成，未传递前一阶段 LLM 结果 | P0 |
| SSE 实时流式输出 | 当前是 LLM 完成后一次性返回所有事件，不是真正的实时 streaming | P1 |
| Critic 重试循环 | Critic 评分低于阈值时应自动触发 E3 重新生成 | P1 |
| 更精细的 prompt 工程 | 当前 prompt 较通用，可针对不同行业/场景优化 | P2 |
| 抽取 Service 接口 | MockTreeifyService 仍承载 CRUD + 生成任务管理，建议抽取 `TreeifyTaskService` 接口 | P2 |
| 生成事件流水表 | SSE 事件持久化到 `treeify_generation_event` 表，便于重放和调试 | P2 |

## 6. 架构说明

```
Controller 层
  └─ GenerateController
       ├─ MockTreeifyService (任务 CRUD + applyEvent)
       │    └─ TreeifyPersistenceService (H2 数据库)
       └─ TreeifyGenerationService (接口)
            ├─ MockGenerationService (@Service, 模板生成)
            └─ AiTreeifyGenerationService (LLM 生成, @Bean @Primary)
                 └─ fallback → MockGenerationService

配置:
  TreeifyGenerationConfig
    treeify.generation.mode=mock|ai|auto
    → 决定 @Primary bean 返回哪个实现
```
