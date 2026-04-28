# Treeify MVP 最终验收清单

> 分支：`codex/backend-contracts`
> 最后更新：2026-04-29

---

## 1. 本地启动方式

### 1.1 环境要求

| 组件 | 版本要求 |
|------|---------|
| JDK | 21+ |
| Maven | 3.9+（或使用项目自带 `./mvnw`） |
| Node.js | 22+（仅前端开发） |

### 1.2 后端启动

```bash
# 最小 Mock 模式启动（无需 API Key）
OPENAI_API_KEY=test ./mvnw spring-boot:run

# 指定端口启动
OPENAI_API_KEY=test ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=18080

# 或先构建再运行
./mvnw -DskipTests package
java -jar target/*.jar
```

后端默认监听 `8080` 端口。`OPENAI_API_KEY=test` 时后端自动降级为 Mock 模式。

### 1.3 前端启动

```bash
cd frontend
npm install              # 仅首次
npm run dev              # 开发服务器 → http://127.0.0.1:5173
```

Vite dev server 通过 proxy 将 `/api` 请求转发到 `http://localhost:8080`。

### 1.4 启动验证

```bash
# 后端健康检查
curl -s http://localhost:8080/api/v1/projects | jq .
# 预期：{"code":0,"data":[...]}

# 前端 → 后端代理检查
curl -s http://localhost:5173/api/v1/projects | jq .
# 预期同上
```

---

## 2. Docker 启动方式

### 2.1 完整启动

```bash
# 在项目根目录执行
docker compose up -d --build
```

访问 `http://localhost:5173/`。

### 2.2 容器架构

| 容器 | 构建源 | 端口映射（宿主机:容器） | 基础镜像 |
|------|--------|----------------------|----------|
| `backend` | 根目录 `Dockerfile` | `8080:8080` | `eclipse-temurin:21-jre-alpine` |
| `frontend` | `frontend/Dockerfile` | `5173:80` | `nginx:1.27-alpine` |

### 2.3 关键配置说明

- `OPENAI_API_KEY` 默认注入值 `test` → Mock 模式联调
- `RAG_ENABLED` Docker 下默认 `false`，避免依赖外部 embedding 服务
- H2 数据库文件保存在命名卷 `treeify-data`，容器重建数据不丢失
- 前端 Nginx 已配置 `proxy_buffering off;` 以支持 SSE 流式传输

### 2.4 Docker 环境验收

```bash
# 验证后端可达
curl -s http://localhost:5173/api/v1/projects | jq '.code'
# 预期：0

# 查看后端模式日志
docker compose logs backend | grep "Treeify generation"
# 预期：Treeify generation: using MOCK (auto-detected, no valid API key)
```

### 2.5 停止与清理

```bash
docker compose down           # 停止容器，保留数据卷
docker compose down -v        # 停止容器并删除数据卷（H2 数据丢失）
```

---

## 3. 环境变量说明

> 以下仅列出占位符，**不包含任何真实 API Key / token**。

### 3.1 后端环境变量

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `OPENAI_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容 API 地址 |
| `OPENAI_API_KEY` | （空） | API Key。设为 `test` 或不设置 → Mock 模式 |
| `OPENAI_CHAT_MODEL` | `glm-4.6` | 对话模型名称 |
| `OPENAI_EMBEDDING_MODEL` | `embedding-3` | Embedding 模型名称 |
| `RAG_ENABLED` | `true` | 是否启用 RAG |
| `TREEIFY_GENERATION_MODE` | `auto` | 生成模式：`mock` / `ai` / `auto` |

### 3.2 前端环境变量

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `VITE_TREEIFY_API_MODE` | `auto` | API 模式：`mock` / `real` / `auto` |

### 3.3 配置文件位置

| 文件 | 用途 |
|------|------|
| `.env.example` | 环境变量模板（可提交） |
| `.env` | 实际环境变量（由 `.gitignore` 排除） |
| `src/main/resources/application.properties` | Spring Boot 配置，引用环境变量 |
| `docker-compose.yml` | Docker 环境变量注入 |

### 3.4 快速配置（Mock 验收）

```bash
# 无需任何真实 Key，直接 Mock 模式运行
export OPENAI_API_KEY=test
export TREEIFY_GENERATION_MODE=mock
```

### 3.5 快速配置（真实 AI 验收）

```bash
# 需替换为实际值
export OPENAI_BASE_URL=<YOUR_OPENAI_COMPATIBLE_BASE_URL>
export OPENAI_API_KEY=<YOUR_API_KEY>
export OPENAI_CHAT_MODEL=<YOUR_CHAT_MODEL>
export TREEIFY_GENERATION_MODE=ai
```

---

## 4. Mock Fallback 验收

### 4.1 验收目标

验证在无有效 API Key 时系统正确降级为 Mock 模式。

### 4.2 触发条件

以下任一条件满足即进入 Mock 模式：

- `OPENAI_API_KEY` 未设置（空字符串）
- `OPENAI_API_KEY=test`（占位值）
- `TREEIFY_GENERATION_MODE=mock`（强制 Mock）
- `TREEIFY_GENERATION_MODE=auto` 且 API Key 无效 → 自动降级

### 4.3 验收步骤

```bash
# Step 1：确认 Mock 模式已激活
docker compose up -d --build
docker compose logs backend | grep "Treeify generation"
# 预期输出：Treeify generation: using MOCK

# Step 2：获取种子项目
curl -s http://localhost:5173/api/v1/projects | jq .
# 预期：至少有一个 "speccase 示例项目"

# Step 3：获取种子用例统计
curl -s http://localhost:5173/api/v1/projects/1/cases/stats | jq .
# 预期：{"code":0,"data":{"total":3,...}}

# Step 4：获取脑图
curl -s http://localhost:5173/api/v1/projects/1/mindmap | jq '.data | length'
# 预期：返回节点列表（从 3 个种子用例推导）

# Step 5：创建生成任务（auto 模式）
curl -s -X POST http://localhost:5173/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户登录功能"}' | jq .
# 预期：返回 taskId，HTTP 202

# Step 6：SSE 流式验证
curl -N http://localhost:5173/api/v1/generate/<taskId>/stream
# 预期：依次收到 4 个阶段事件（E1→E2→E3→Critic→完成）
# 事件格式：id:<seq>\ndata:{...}\n\n
```

### 4.4 验收标准

| 检查项 | 标准 |
|--------|------|
| 后端启动日志 | 显示 "using MOCK" |
| 阶段事件 | E1、E2、E3、Critic 4 个阶段依次触发 |
| SSE 事件间隔 | 约 350ms |
| 任务状态 | 生成完成后状态为 `done` |
| Critic 评分 | 固定 88（Mock 特征值） |
| 生成用例 | 固定 4 条预定义用例（登录场景默认用例） |

---

## 5. 真实 AI 模式验收

### 5.1 验收目标

验证真实 LLM 调用链路的正确性。

### 5.2 触发条件

- `TREEIFY_GENERATION_MODE=ai`，且
- `OPENAI_API_KEY` 为有效值（非空、非 `test`）

### 5.3 验收步骤

```bash
# Step 1：配置真实环境变量
export OPENAI_BASE_URL=<YOUR_OPENAI_COMPATIBLE_BASE_URL>
export OPENAI_API_KEY=<YOUR_API_KEY>
export OPENAI_CHAT_MODEL=<YOUR_CHAT_MODEL>
export TREEIFY_GENERATION_MODE=ai

# Step 2：启动并验证模式
docker compose up -d --build
docker compose logs backend | grep "Treeify generation"
# 预期输出：Treeify generation: using AI (forced by config)

# Step 3：创建生成任务
TASK_RESP=$(curl -s -X POST http://localhost:5173/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"用户注册功能：包含手机号验证码注册、密码设置、昵称填写"}')
TASK_ID=$(echo $TASK_RESP | jq -r '.data.taskId')
echo "Task: $TASK_ID"

# Step 4：SSE 流式接收
curl -N http://localhost:5173/api/v1/generate/$TASK_ID/stream
```

### 5.4 验收标准

| 检查项 | 标准 |
|--------|------|
| 启动日志 | 显示 "using AI (forced by config)" |
| llmAvailable | 日志中 `llmAvailable=true` |
| E1 结果 | 返回结构化 JSON（businessGoals/userActions/systemBehaviors/constraints），内容与输入相关 |
| E2 结果 | 返回可测试对象列表，拆分合理 |
| E3 用例 | 用例内容与输入需求匹配，覆盖 happy/error/boundary 路径 |
| Critic 评分 | 非固定值（≠ 88），动态评分 |
| 降级行为 | LLM 调用失败时自动降级到 Mock（日志包含 "falling back to mock"） |

### 5.5 AI 失败降级验证（可选）

故意配置错误的 `OPENAI_BASE_URL` 或无效 `OPENAI_API_KEY`，确认：

- 日志出现 "AI generation failed ... falling back to mock"
- 仍然返回完整的 SSE 事件序列（Mock 内容）
- 前端无报错

---

## 6. Auto 模式验收

### 6.1 验收目标

验证 `TREEIFY_GENERATION_MODE=auto` 的自动检测逻辑。

### 6.2 检测规则

```
OPENAI_API_KEY 有效（非空且 ≠ "test"） → AI 模式
否则                                     → Mock 模式
```

### 6.3 验收场景

#### 场景 A：有效 Key → AI

```bash
export OPENAI_API_KEY=<YOUR_VALID_API_KEY>
export TREEIFY_GENERATION_MODE=auto
docker compose up -d --build
docker compose logs backend | grep "Treeify generation"
# 预期：Treeify generation: using AI (auto-detected from API key)
```

#### 场景 B：占位 Key → Mock

```bash
export OPENAI_API_KEY=test
export TREEIFY_GENERATION_MODE=auto
docker compose up -d --build
docker compose logs backend | grep "Treeify generation"
# 预期：Treeify generation: using MOCK (auto-detected, no valid API key)
```

#### 场景 C：未设置 Key → Mock

```bash
unset OPENAI_API_KEY
export TREEIFY_GENERATION_MODE=auto
docker compose up -d --build
docker compose logs backend | grep "Treeify generation"
# 预期：Treeify generation: using MOCK
```

### 6.4 验收标准

| 场景 | API Key | 预期模式 | 启动日志关键字 |
|------|---------|---------|--------------|
| A | 有效值 | AI | "using AI (auto-detected from API key)" |
| B | `test` | Mock | "using MOCK (auto-detected, no valid API key)" |
| C | 未设置 | Mock | "using MOCK (auto-detected, no valid API key)" |

---

## 7. Step 逐步确认验收

### 7.1 验收目标

验证 Step 模式下逐阶段确认的完整交互流程。

### 7.2 流程概览

```
创建任务(mode=step) → SSE E1 → 用户确认 → SSE E2 → 用户确认 → SSE E3+Critic → 完成
```

### 7.3 验收步骤

```bash
# Step 1：创建 Step 模式任务
TASK_RESP=$(curl -s -X POST http://localhost:5173/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"step","input":"用户登录功能：支持账号密码登录和手机验证码登录"}')
TASK_ID=$(echo $TASK_RESP | jq -r '.data.taskId')
echo "Task: $TASK_ID"

# Step 2：SSE 接收 E1（观察 needConfirm=true）
curl -N http://localhost:5173/api/v1/generate/$TASK_ID/stream
# 预期：收到 E1 的 STAGE_DONE 事件，payload.needConfirm = true
# SSE 连接随后关闭（等待确认）

# Step 3：确认 E1（带 feedback）→ 进入 E2
curl -s -X POST http://localhost:5173/api/v1/generate/$TASK_ID/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e1","feedback":"请补充安全测试维度"}' | jq .
# 预期：返回的 task 中 feedback 字段为 "请补充安全测试维度"

# Step 4：重新连接 SSE 接收 E2（观察 needConfirm=true）
curl -N http://localhost:5173/api/v1/generate/$TASK_ID/stream
# 预期：收到 E2 的 STAGE_DONE 事件，payload.needConfirm = true

# Step 5：确认 E2（带 feedback）→ 进入 E3+Critic
curl -s -X POST http://localhost:5173/api/v1/generate/$TASK_ID/confirm \
  -H "Content-Type: application/json" \
  -d '{"stage":"e2","feedback":"用例需覆盖边界场景"}' | jq .

# Step 6：重新连接 SSE 接收最后阶段
curl -N http://localhost:5173/api/v1/generate/$TASK_ID/stream
# 预期：E3 + Critic + GENERATION_COMPLETE，无 needConfirm
```

### 7.4 验收标准

| 检查项 | 标准 |
|--------|------|
| E1 STAGE_DONE | `needConfirm: true`，包含 E1 分析结果 JSON |
| E2 STAGE_DONE | `needConfirm: true`，包含 E2 拆分结果 JSON |
| 确认后状态变更 | 任务 currentStage 由 e1 → e2 → e3 |
| E3+Critic | 自动完成，`needConfirm: false` |
| Feedback 持久化 | confirm 时带 `feedback`，查询任务时 `feedback` 字段有值 |
| E1/E2 result 持久化 | `GET /generate/{taskId}` 返回 `e1Result`/`e2Result` 非空 |
| 取消任务 | `POST /cancel` 后任务状态为 `canceled` |
| 任务查询 | `GET /generate/{taskId}` 返回正确的 currentStage 和 status |

### 7.5 已知注意点

Step 模式的 E2 和 E3 阶段**已实现**阶段间上下文传递（P1-3 已完成）。E2 prompt 包含 E1 分析结果，E3 prompt 包含 E1+E2 结果，confirm 时的 feedback 拼入下一阶段 prompt。详见 §11.2。Mock 模式下阶段间数据不影响 mock 结果（预硬编码），真实 AI 模式下可验证上下文传递效果。

---

## 8. 策略红包需求完整链路验收

### 8.1 场景说明

策略红包是 Mock 模式下的第二个预定义场景，通过输入关键词触发。

### 8.2 触发条件

输入文本中包含以下任一关键词：

- `红包`
- `提现`
- `tag`

### 8.3 验收步骤

```bash
# Step 1：确保 Mock 模式
export OPENAI_API_KEY=test
export TREEIFY_GENERATION_MODE=mock

# Step 2：创建策略红包生成任务
TASK_RESP=$(curl -s -X POST http://localhost:5173/api/v1/projects/1/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto","input":"策略红包功能：用户在活动页看到红包 tag，点击进入提现页"}')
TASK_ID=$(echo $TASK_RESP | jq -r '.data.taskId')

# Step 3：SSE 流式验证
curl -N http://localhost:5173/api/v1/generate/$TASK_ID/stream
```

### 8.4 验收标准 — E1 阶段

| 字段 | 预期内容 |
|------|---------|
| 需求分析 | "正在解析策略红包展示..." |
| 业务目标 | 策略红包 tag 在活动主页对符合策略的用户可见 |

### 8.5 验收标准 — E2 阶段（4 个可测试对象）

| 可测试对象 | 类型 |
|-----------|------|
| 策略红包 tag 展示 | ui |
| 点击策略红包进入提现详情页 | function |
| 策略红包库存不足时提示"已被抢光" | function |
| 提现完成后活动主页状态更新 | flow |

### 8.6 验收标准 — E3 阶段（4 个测试用例）

| 用例标题 | 优先级 | 路径类型 |
|---------|--------|---------|
| 策略红包仍有余额时展示对应 tag | P0 | happy |
| 点击策略红包进入提现详情页 | P0 | happy |
| 策略红包库存不足时提示已被抢光 | P0 | error |
| 提现完成后活动主页状态更新 | P1 | alternative |

### 8.7 验收标准 — 其他

| 检查项 | 标准 |
|--------|------|
| Critic 评分 | 88（Mock 固定值） |
| 用例 tags | `["red-packet","mock"]` |
| 用例 source | `"mock"` |
| 4 个阶段完整 | E1 → E2 → E3 → Critic → 完成 |

---

## 9. 脑图保存与刷新恢复验收

### 9.1 验收目标

验证脑图的保存、加载和恢复机制。

### 9.2 数据存储

- **数据库：** H2 文件数据库（`./data/treeify.mv.db`），表 `TREEIFY_MINDMAP_NODE`
- **JPA 仓库：** `TreeifyMindmapNodeRepository`
- **服务层：** `TreeifyPersistenceService`（`@Transactional`）

### 9.3 验收步骤

#### 9.3.1 首次加载（从用例推导）

```bash
# 首次访问脑图（无已保存节点时从用例推导）
curl -s http://localhost:5173/api/v1/projects/1/mindmap | jq '.'
# 预期：返回从种子用例推导的节点列表
# 每个用例推导出 4 个节点：用例本身、前置条件、步骤、预期结果
# 节点分布在 3 个通道（lane）中
```

#### 9.3.2 保存脑图

```bash
# 保存修改后的脑图
curl -s -X PUT http://localhost:5173/api/v1/projects/1/mindmap \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "1",
        "projectId": 1,
        "parentId": null,
        "title": "自定义根节点",
        "kind": "case",
        "priority": "P0",
        "depth": 0,
        "orderIndex": 0,
        "lane": "center"
      },
      {
        "id": "2",
        "projectId": 1,
        "parentId": "1",
        "title": "测试手机号登录",
        "kind": "case",
        "priority": "P0",
        "depth": 1,
        "orderIndex": 1,
        "lane": "center",
        "precondition": "用户已注册",
        "steps": ["打开登录页", "输入手机号", "点击获取验证码"],
        "expected": "登录成功"
      }
    ]
  }' | jq .
# 预期：{"code":0}
```

#### 9.3.3 刷新恢复验证

```bash
# 重新获取脑图，确认保存的节点被正确加载
curl -s http://localhost:5173/api/v1/projects/1/mindmap | jq '.data | length'
# 预期：返回保存的节点数量（应为 2）

# 页面前端刷新后自动调用此 API，展示保存的脑图
```

#### 9.3.4 确认用例保留验证

```bash
# 在 Step 模式下确认 E3 生成的用例后
# 验证确认的用例被正确添加到脑图中
# （最近提交 0a270ee 修复了此场景的保留逻辑）
```

### 9.4 验收标准

| 检查项 | 标准 |
|--------|------|
| 首次加载（无保存） | 从用例推导节点，推导规则正确（4 节点/用例） |
| 保存后重新获取 | 返回保存的节点，不再从用例推导 |
| 刷新恢复 | 页面刷新后调用 API，展示已保存的脑图 |
| 节点排序 | 按 `orderIndex ASC, depth ASC, id ASC` |
| 事务性 | 保存时先删除旧节点再插入新节点，在同一事务中 |
| 不同项目隔离 | 每个项目的脑图独立存储，互不影响 |
| 删除项目 | 脑图节点不级联删除（只软删除项目） |

---

## 10. 常见问题排查

### 10.1 SSE 连接中断

**现象：** 前端提示 "SSE 连接中断"。

**排查步骤：**

```bash
# 1. 确认后端存活
docker compose ps backend
ps aux | grep java

# 2. 查看后端日志
docker compose logs backend --tail 50

# 3. 直接访问 SSE 端点
curl -N http://localhost:8080/api/v1/generate/<taskId>/stream

# 4. 检查 Nginx proxy buffering
docker compose exec frontend cat /etc/nginx/conf.d/default.conf | grep proxy_buffering
# 必须是 proxy_buffering off;

# 5. 检查后端异常
docker compose logs backend | grep -i "error\|exception"
```

**常见原因：**

| 原因 | 解决方案 |
|------|---------|
| Nginx proxy buffering 未关闭 | 确保 `proxy_buffering off;` |
| 后端 process 挂了 | 检查 OOM、端口冲突 |
| LLM 调用超时 | 增大 `proxy_read_timeout`（建议 3600s） |
| 客户端主动断开 | 检查前端 EventSource onerror 处理逻辑 |

### 10.2 脑图保存失败

**现象：** 保存后 dirty 标记不清除，或 API 返回错误。

```bash
# 1. 确认前端 API 模式
# VITE_TREEIFY_API_MODE=mock → 不发送请求，仅清除 dirty

# 2. 测试后端保存 API
curl -s -X PUT http://localhost:8080/api/v1/projects/1/mindmap \
  -H "Content-Type: application/json" \
  -d '{"nodes":[]}'

# 3. 检查 H2 文件权限
ls -la data/
docker compose exec backend ls -la /app/data/

# 4. 查看后端 SQL 日志
docker compose logs backend | grep -i "mindmap\|hibernate\|sql"
```

### 10.3 H2 数据库清理

```bash
# 本地：删除数据库文件后重启
rm -rf data/treeify.mv.db data/treeify.trace.db
# 重启后端 → Hibernate ddl-auto=update 自动重建表
# TreeifyPersistenceService.seedDemoData() 自动插入示例数据

# Docker：删除命名卷
docker compose down -v
docker compose up -d --build

# Docker：仅删除数据库文件
docker compose exec backend rm -f /app/data/treeify.mv.db
docker compose restart backend
```

### 10.4 AI 模式不生效

**现象：** 配置了有效 API Key 但仍然使用 Mock。

```bash
# 1. 确认环境变量已传入容器
docker compose exec backend env | grep OPENAI

# 2. 确认模式不是 mock
docker compose exec backend env | grep TREEIFY

# 3. 确认 API Key 不是 "test"
# OPENAI_API_KEY=test → llmAvailable=false

# 4. 查看配置检测日志
docker compose logs backend | grep "Treeify generation"
docker compose logs backend | grep "llmAvailable"
```

### 10.5 CORS 错误

**本地开发：** Vite proxy 已处理，前端 `localhost:5173` → 后端 `localhost:8080`。

**Docker：** Nginx 反向代理，前后端同域（`localhost:5173`），无 CORS 问题。

---

## 11. 已知限制

### 11.1 真实 AI 非 Token Streaming

`AiTreeifyGenerationService` 使用 `ChatClient.prompt().call().content()`（阻塞调用，等待完整响应），而非 `stream().content()`。每个阶段的 LLM 调用等待完整响应后才构造 SSE 事件。SSE 的 `stage_chunk` 内容为预生成文本，不是实时 token。

### 11.2 Step 模式中间结果传递（P1-3 已完成）

Step 模式的 E2、E3 阶段**已实现**阶段间上下文传递。E2 使用 `e2Prompt(input, e1Result)` 带上 E1 分析结果，E3 使用 `e3Prompt(input, e1Result, e2Result)` 带上两阶段结果。confirm 时的 `feedback` 也会拼入下一阶段 prompt。与 Auto 模式（`rebuildAutoEvents`）行为一致。详细验证见 `docs/P1_step_context_validation.md`。

### 11.3 节点编辑/删除/执行状态持久化（P1-1 已完成）

节点操作（编辑标题/优先级/标签、删除节点、切换执行状态）**已实现**后端持久化，刷新后不丢失。

**实现方式**：`useCasePersistence` hook（`frontend/src/features/workspace/useCasePersistence.ts`）监听三组 dirty ID，自动调用后端 API：

| 操作 | Dirty 追踪 | API 调用 | Debounce |
|------|-----------|---------|----------|
| 删除节点 | `deletedCaseIds` | `DELETE /api/v1/cases/{caseId}` | 立即 |
| 执行状态变更 | `statusDirtyIds` | `PATCH /api/v1/cases/{caseId}/execution-status` | 600ms |
| 内容编辑（标题/优先级/标签） | `caseDirtyIds` | `PUT /api/v1/cases/{caseId}` | 900ms |

每次 API 调用成功后自动刷新统计（`refreshStats`）。Mock 模式下跳过 API 调用，仅清除 dirty 标记。脑图整体保存（`PUT /projects/{id}/mindmap`）通过 `useWorkspaceAutosave` 作为兜底。

### 11.4 顶部统计改用后端 /cases/stats（P1-2 已完成）

顶部统计栏（总用例数、已测数、通过数、通过率）**已实现**从后端 `GET /api/v1/projects/{projectId}/cases/stats` 获取。

**实现方式**：`useProjectLoader` 在加载项目和用例时调用 `getProjectCaseStats()`，结果存入 `serverStats`。`App.tsx` 中 `const stats = serverStats || localStats`，服务端数据优先，本地计算作 fallback。`useCasePersistence` 在每次用例变更后自动调用 `refreshStats()` 刷新。

### 11.5 真实 AI 需有效 API Key

AI 模式依赖有效的 `OPENAI_API_KEY` 和可访问的 `OPENAI_BASE_URL`。任一不可用会降级为 Mock。

### 11.6 H2 文件数据库

- 单实例访问（文件锁），不适合多实例部署
- 数据文件 `data/treeify.mv.db` 需挂载卷持久化
- Docker `down -v` 会删除数据

### 11.7 Spring AI 里程碑版本

- `spring-ai` 版本 `2.0.0-M4`（Milestone），API 可能变动
- Spring Boot `4.0.5`，前沿版本

### 11.8 脑图与用例非强绑定

脑图节点通过 `caseId` 关联测试用例，但二者独立 CRUD。脑图保存后若单独删除用例，节点不自动同步。

### 11.9 无分页

项目和用例列表 API 无分页，大量数据时性能需关注。

### 11.10 无用户认证

系统当前无用户认证/授权机制，所有 API 可以匿名访问。

---

## 12. 演示前检查清单

### 12.1 环境准备

- [ ] 代码已切换到 `codex/backend-contracts` 分支
- [ ] 无未提交改动干扰运行（`git status` 干净）
- [ ] Docker 已安装并可用（`docker --version`）
- [ ] 端口 5173、8080 未被占用

### 12.2 Mock 模式演示

- [ ] `docker compose down -v` 清理旧数据
- [ ] `docker compose up -d --build` 启动成功
- [ ] `curl localhost:5173/api/v1/projects` 返回 seed 项目
- [ ] 浏览器打开 `http://localhost:5173`，页面正常加载
- [ ] 思维导图区域显示 seed 用例
- [ ] 输入"策略红包功能"创建 Auto 模式生成任务
- [ ] SSE 流式展示 4 个阶段（E1→E2→E3→Critic）
- [ ] 生成的 4 个策略红包用例出现在结果面板
- [ ] 手动导入生成的用例到脑图
- [ ] 在脑图上编辑/移动节点
- [ ] 保存脑图成功
- [ ] 刷新页面，脑图恢复为保存状态

### 12.3 Step 模式演示

- [ ] 创建 Step 模式任务（输入任意文本）
- [ ] E1 阶段完成 → 显示分析结果，等待确认
- [ ] 点击确认 → E2 阶段开始
- [ ] E2 阶段完成 → 显示拆分结果，等待确认
- [ ] 点击确认 → E3+Critic 自动完成
- [ ] 用例可导入到脑图

### 12.4 真实 AI 模式演示（如有有效 Key）

- [ ] 设置有效 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`OPENAI_CHAT_MODEL`
- [ ] `TREEIFY_GENERATION_MODE=ai`
- [ ] 重启后端，确认日志显示 "using AI"
- [ ] 创建生成任务，输入真实需求文本
- [ ] E1/E2/E3 结果与输入需求相关（非固定模板）
- [ ] Critic 评分非固定值（≠ 88）
- [ ] 用例质量合理、覆盖多路径

### 12.5 降级行为演示

- [ ] 用有效 Key 启动 → AI 模式
- [ ] 运行时将后端 `OPENAI_BASE_URL` 改为无效地址（或重启设错误 Key）
- [ ] 创建生成任务 → 降级为 Mock
- [ ] 前端不报错，用户无感知

### 12.6 演示后清理

- [ ] `docker compose down` 停止容器
- [ ] 确认无遗留容器/进程

---

## 附录 A：API 端点速查

### 项目

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects` | 项目列表 |
| POST | `/api/v1/projects` | 创建项目 |
| GET | `/api/v1/projects/{id}` | 项目详情 |
| PUT | `/api/v1/projects/{id}` | 更新项目 |
| DELETE | `/api/v1/projects/{id}` | 归档项目 |

### 用例

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects/{id}/cases` | 用例列表 |
| GET | `/api/v1/projects/{id}/cases/stats` | 用例统计 |
| POST | `/api/v1/projects/{id}/cases` | 创建用例 |
| PUT | `/api/v1/cases/{id}` | 更新用例 |
| DELETE | `/api/v1/cases/{id}` | 删除用例 |
| PATCH | `/api/v1/cases/{id}/execution-status` | 更新执行状态 |
| POST | `/api/v1/cases/batch-confirm` | 批量导入用例 |

### 脑图

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects/{id}/mindmap` | 获取脑图 |
| PUT | `/api/v1/projects/{id}/mindmap` | 保存脑图 |

### 生成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/projects/{id}/generate` | 创建生成任务 |
| GET | `/api/v1/generate/{taskId}` | 查询任务 |
| GET | `/api/v1/generate/{taskId}/stream` | SSE 流式事件 |
| POST | `/api/v1/generate/{taskId}/confirm` | 确认阶段（Step） |
| POST | `/api/v1/generate/{taskId}/cancel` | 取消任务 |

### SSE 事件类型

| 事件名 | 说明 |
|--------|------|
| `stage_started` | 阶段开始 |
| `stage_chunk` | 阶段内容增量 |
| `stage_done` | 阶段完成（含 `needConfirm`） |
| `generation_complete` | 全部完成 |

### 任务状态

`pending` → `e1` → `wait_confirm` → `e2` → `wait_confirm` → `e3` → `critic` → `done` / `canceled`
