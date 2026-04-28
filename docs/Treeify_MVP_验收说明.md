# Treeify MVP 验收说明

## 1. 本地启动方式

### 1.1 后端启动

**环境要求：** Java 21+、Maven 3.9+（或使用项目自带的 Maven Wrapper `./mvnw`）

```bash
# 使用 Maven Wrapper 启动（默认端口 8080）
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=test \
./mvnw spring-boot:run

# 指定自定义端口
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
OPENAI_API_KEY=test \
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=18080
```

当 `OPENAI_API_KEY=test`（占位值）时，后端自动判定 LLM 不可用，生成模式降级为 mock（见第 4 节）。

### 1.2 前端启动

**环境要求：** Node.js 22+

```bash
cd frontend
npm install   # 首次启动时安装依赖
npm run dev   # 启动开发服务器
```

前端开发服务器默认监听 `127.0.0.1:5173`，并通过 Vite proxy 将 `/api` 请求转发到 `http://localhost:8080`。

---

## 2. Docker 启动方式

### 完整启动

在项目根目录执行：

```bash
docker compose up -d --build
```

启动后访问 `http://localhost:5173/`。

### 架构说明

| 容器 | 构建源 | 监听端口（宿主机:容器） | 基础镜像 |
|------|--------|------------------------|----------|
| backend | `Dockerfile`（项目根目录） | `8080:8080` | eclipse-temurin:21-jre-alpine |
| frontend | `frontend/Dockerfile` | `5173:80` | nginx:1.27-alpine |

### 关键配置

- `OPENAI_API_KEY` 默认注入 `test`，便于 mock 模式联调
- `RAG_ENABLED` 默认 `false`，避免启动时依赖外部 embedding 服务
- H2 文件数据库挂载在 Docker 命名卷 `treeify-data`，容器重建后数据不丢失

### 基础验收

```bash
curl -s http://localhost:5173/api/v1/projects | jq .
```

返回 JSON 中 `code` 为 `0` 即说明前端 Nginx 已成功代理到后端。

---

## 3. 前端/后端端口

| 角色 | 本地开发 | Docker |
|------|---------|--------|
| 后端 | `8080`（可通过 `--server.port` 覆盖） | `8080`（映射宿主机 8080） |
| 前端 | `5173`（Vite dev server） | `80`（Nginx，映射宿主机 5173） |

### 前后端通信方式

- **本地开发：** Vite proxy（`vite.config.ts`）将前端 `/api` 请求代理到 `http://localhost:8080`
- **Docker：** 前端 Nginx（`frontend/nginx.conf`）将 `/api/` 请求代理到 `http://backend:8080/api/`，并关闭 proxy buffering 以支持 SSE

### Nginx SSE 相关配置

```
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

---

## 4. 模式说明

系统有两层独立的模式切换机制：**前端 API 模式** 和 **后端生成模式**。

### 4.1 前端 API 模式

由环境变量 `VITE_TREEIFY_API_MODE` 控制，在 `frontend/src/shared/api/treeify.ts` 中读取：

| 模式 | 值 | 行为 |
|------|----|------|
| **mock** | `"mock"` | 所有操作在本地进行：SSE 生成走 JS 定时器模拟，思维导图保存仅标记 dirty，不发送 HTTP 请求 |
| **real** | `"real"` | 始终调用真实后端 API，失败时抛出错误 |
| **auto** | `"auto"`（默认） | 优先调用后端 API，失败时自动降级为本地 mock |

该模式影响的核心操作：
- 项目加载（`useProjectLoader.ts`）
- SSE 生成（`useGenerateStream.ts`）
- 思维导图保存（`useMindmapSave.ts`）

### 4.2 后端生成模式

由环境变量 `TREEIFY_GENERATION_MODE` 控制，在 `application.properties` 中默认为 `auto`：

| 模式 | 值 | 行为 |
|------|----|------|
| **mock** | `"mock"` | 强制使用 `MockGenerationService`，基于关键词匹配（"红包"/"提现"/"tag"）返回预定义的 SSE 事件序列 |
| **ai** | `"ai"` | 强制使用 `AiTreeifyGenerationService` 调用真实 LLM；失败时降级为 mock |
| **auto** | `"auto"`（默认） | 检测 API key 是否存在且不为空且不为 `"test"` — 有效则用 AI，否则用 mock |

### 4.3 后端 auto/step 模式

生成任务请求体中的 `mode` 字段控制生成流程：

| 值 | 行为 |
|----|------|
| **auto** | 一次性完成 E1 → E2 → E3 → Critic 全部阶段，中间无停顿 |
| **step** | 逐阶段执行，每阶段结束后需用户确认（`needConfirm=true`）才进入下一阶段 |

### 4.4 模式组合示例

| 前端模式 | 后端模式 | 生成模式 | 效果 |
|---------|---------|---------|------|
| `auto` + `OPENAI_API_KEY=test` | `auto`（默认） | auto | 前端调后端 API，后端 LLM 不可用 → mock 生成，SSE 通过 HTTP 流式返回 |
| `mock` + 任意 | 任意 | 任意 | 前端完全本地运行，不发送任何 HTTP 请求 |
| `real` + 有效 API Key | `ai` | step | 全链路真实 AI，逐步确认，SSE 流式传输 |
| `auto` + 有效 API Key | `auto` | auto | 前端调后端 API，后端检测到有效 key → AI 生成 |

---

## 5. 完整验收链路

### 5.1 Mock 链路（不需要 API Key）

```bash
# 1. 构建并启动
docker compose up -d --build

# 2. 验证后端项目 API
curl -s http://localhost:5173/api/v1/projects
# 预期：{"code":0,"data":[{"id":1,"name":"speccase 示例项目",...}]}

# 3. 获取项目思维导图
curl -s http://localhost:5173/api/v1/projects/1/mindmap
# 预期：{"code":0,"data":[...思维导图节点...]}

# 4. 浏览器打开 http://localhost:5173，确认：
#    - 页面加载思维导图展示
#    - 输入文本后点击生成，观察 SSE 流式阶段显示（E1 → E2 → E3 → Critic）
#    - mock 模式下仅显示"需求分析"阶段结果（前端 mock 模式 UI 展示固定阶段）
#    注：前端设为 VITE_TREEIFY_API_MODE=auto 时，默认实际调用后端 API。
#    后端 OPENAI_API_KEY=test → 后端使用 MockGenerationService
#    完整 flow：前端调用后端 API → 后端返回 mock SSE 事件序列

# 5. 测试确认/取消
#    step 模式下每阶段完成后需用户点击确认才进入下一阶段
```

### 5.2 真实 AI 链路（需要有效 API Key）

```bash
# 1. 配置环境变量
export OPENAI_API_KEY=sk-xxxxx
export OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
export OPENAI_CHAT_MODEL=glm-4.6

# 2. 构建并启动
docker compose up -d --build

# 3. 验证后端处于 AI 模式
#    查看后端日志，确认 "Treeify generation: using AI"
docker compose logs backend | grep "Treeify generation"

# 4. 浏览器验收
#    - 输入真实需求文本（如"用户登录功能"）
#    - 选择 auto 或 step 模式
#    - 确认生成的测试用例合理且与输入相关
#    - 确认 Critic 评分非固定值（mock 固定 88）
```

### 5.3 完整页面流转

1. **页面加载** → 自动加载项目列表，选中默认项目（ID=1）
2. **思维导图展示** → 加载已保存的思维导图节点，若无则从用例推导展示
3. **输入需求** → 用户在输入框中输入需求文本
4. **选择模式** → 选择 auto（一次性）或 step（逐阶段确认）
5. **点击生成** → SSE 流开始，GeneratePanel 展示各阶段进度
6. **查看阶段性结果** → E1 需求分析、E2 测试对象拆分、E3 用例生成
7. **Critic 评分** → 生成完成后 AI 评审给出评分和建议
8. **确认用例** → 生成的用例进入思维导图，可编辑、删除
9. **保存思维导图** → 修改后保存，dirty 标记清除

---

## 6. 已知限制

### 6.1 真实 AI 需要有效 Key

`AiTreeifyGenerationService` 调用 LLM 时需要有效的 API Key 和正确的 Base URL。当 `OPENAI_API_KEY` 为空或为 `"test"` 时自动降级为 `MockGenerationService`。即使设置了 `treeify.generation.mode=ai`，若 LLM 调用失败（网络问题、认证失败、响应解析失败），也会降级为 mock。

### 6.2 Auto 模式下真实 AI 输出当前不是 Token Streaming

`AiTreeifyGenerationService` 使用 `ChatClient.prompt().call().content()`（阻塞调用，等待完整响应），而非 `ChatClient.prompt().stream().content()`（逐 token 流式）。这意味着：

- 每个阶段（E1/E2/E3/Critic）的 LLM 调用**等待完整响应**后才构造 SSE 事件
- SSE 事件仍然以 350ms 延迟逐条发送，但每条 `stage_chunk` 包含的 content 是预先生成的文本，而非实时 token
- 体验上是"阶段性刷新"，不是"逐字流式"
- 要实现真正的 token streaming，需改为 `stream().content()` 并实时构造 SSE 事件

### 6.3 Step 模式中间结果传递（P1-3 已完成）

`AiTreeifyGenerationService` 的 step 模式**已实现**阶段间上下文传递：

- **E1 结果传递给 E2：** `buildAiStepE2Events` 从任务记录读取 `e1Result`，调用 `e2Prompt(input, e1Json)` 拼入 E1 分析结果；若解析失败则 fallback 到 `e2PromptFromInput(input)`
- **E1/E2 结果传递给 E3：** `buildAiFinalEvents` 从任务记录读取 `e1Result` + `e2Result`，调用 `e3Prompt(input, e1Json, e2Json)` 拼入两阶段分析结果；若解析失败则 fallback 到 `e3PromptFromInput(input)`
- **用户 feedback 传递：** confirm 时可附 `feedback`，下一阶段 prompt 拼入"用户反馈：xxx"
- **实现链路：** `STAGE_DONE` → `applyEvent()` → `persistence.saveStageResult()` → DB 持久化 → confirm 后 `GenerateController.streamGenerateTask()` 从 DTO 读取 → 传入 `buildEvents()`

---

## 7. 常见问题

### 7.1 SSE 中断怎么排查

**现象：** 生成过程中前端提示"SSE 连接中断，请检查后端服务或切换到 mock 模式"。

**排查步骤：**

```bash
# 1. 确认后端容器/进程是否存活
docker compose ps          # Docker
ps aux | grep java         # 本地进程

# 2. 查看后端日志
docker compose logs backend
# 或本地查看控制台输出

# 3. 确认生成任务是否正常创建
curl -s http://localhost:5173/api/v1/projects/1/generate/task-xxx

# 4. 直接访问 SSE 端点验证
curl -N http://localhost:5173/api/v1/generate/task-xxx/stream
# 应看到 SSE data 行逐条输出

# 5. 检查 Nginx/Vite proxy 是否关闭了 proxy buffering
# Docker：确认 nginx.conf 中有 proxy_buffering off;
# 本地开发：Vite proxy 默认支持 SSE，无需额外配置
```

**常见原因：**
- Nginx proxy buffering 未关闭 → 确保 `proxy_buffering off;`
- 后端处理超时 → 检查 `proxy_read_timeout` 是否足够（建议 3600s）
- 后端异常 → 查看后端日志中的 Exception
- 前端 EventSource 自动重连 → 前端已处理 `onerror`，预期关闭不会报错

### 7.2 保存失败怎么排查

**现象：** 点击保存后页面保留 dirty 标记，或 API 返回错误。

**排查步骤：**

```bash
# 1. 确认前端模式
# VITE_TREEIFY_API_MODE=mock 时保存不发送请求，仅清除 dirty 标记
# 若前端为 mock 模式，"保存失败"可能是 UI 逻辑问题

# 2. 检查后端保存 API
curl -s -X PUT http://localhost:5173/api/v1/projects/1/mindmap \
  -H "Content-Type: application/json" \
  -d '{"nodes":[]}'
# 预期返回 code:0

# 3. 检查后端日志是否有 SQL 异常
docker compose logs backend | grep -i "mindmap\|error\|exception"

# 4. 检查 H2 数据库文件权限
ls -la data/                    # 本地
docker compose exec backend ls -la /app/data/   # Docker

# 5. 保存后重新加载确认
curl -s http://localhost:5173/api/v1/projects/1/mindmap | jq '.data | length'
```

### 7.3 H2 数据如何清理

**本地开发环境：**

```bash
# 方式一：删除数据库文件（推荐）
rm -rf data/treeify.mv.db data/treeify.trace.db
# 重启后端后 Hibernate ddl-auto=update 会自动重建表
# seed 数据会在启动时自动插入（通过 TreeifyPersistenceService 检测数据库为空时）

# 方式二：通过 H2 Console 手动清理
# 启动后端后访问 http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:file:./data/treeify
# 执行 DELETE / TRUNCATE / DROP 语句
```

**Docker 环境：**

```bash
# 方式一：删除命名卷（会丢失所有数据）
docker compose down -v
docker compose up -d --build

# 方式二：进入容器删除文件
docker compose exec backend rm -f /app/data/treeify.mv.db /app/data/treeify.trace.db
docker compose restart backend
# 重启后 seed 数据自动重建

# 方式三：仅清理表数据（保留文件）
docker compose exec backend rm -f /app/data/treeify.mv.db
docker compose restart backend
```

**验证清理成功：**

```bash
curl -s http://localhost:5173/api/v1/projects
# 应返回包含 seed 项目的数据（自动重建）
```
