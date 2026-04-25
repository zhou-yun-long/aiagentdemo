**Treeify**

AI 驱动测试用例生成平台

开发需求文档（Technical Spec）

| 字段 | 值 |
| --- | --- |
| 版本 | v1.0 |
| 日期 | 2026-04 |
| 状态 | 草稿 |
| 技术栈 | Spring Boot · React · Spring AI · pgvector |

# 1. 项目总览

## 1.1 技术架构总览

| 层次 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18 + TypeScript + Vite | 组件化 SPA，流式 SSE 渲染 |
| 后端 | Spring Boot 3.x + Spring AI | RESTful API + AI 编排层 |
| AI 框架 | Spring AI 1.x | Sub-agent / RAG / 流式输出原生支持 |
| LLM | OpenAI GPT-4o（可切换） | 通过 Spring AI 统一接口，支持替换 |
| 向量存储 | pgvector（PostgreSQL 扩展） | 与业务库合并，零额外运维 |
| 业务数据库 | MySQL 8.0 | 用例、项目、用户数据 |
| 缓存 | Redis 7 | 摘要缓存、会话状态 |
| 外部集成 | MCP 协议 | Jira / 禅道 / CI 工具调用 |
| 部署 | Docker + Kubernetes | 容器化，支持弹性扩容 |

## 1.2 模块划分

| 模块 | 前端组件 | 后端服务 | 说明 |
| --- | --- | --- | --- |
| 项目管理 | ProjectList / ProjectDetail | ProjectService | 项目 CRUD、成员、摘要 |
| 摘要 Agent | SummaryStatus（状态展示） | SummaryAgentService | 摘要生成/续写/校验 |
| 三阶段引擎 | GeneratePanel（流式展示） | OrchestrationService | E1/E2/E3 Sub-agent 编排 |
| RAG 知识库 | KnowledgeManager | KnowledgeService | 入库/检索/管理 |
| 用例管理 | CaseList / CaseEditor | TestCaseService | CRUD、版本、导出 |
| MCP 集成 | IntegrationSettings | McpToolService | 外部工具调用 |

# 2. 数据库设计

  📌  MySQL 存业务数据；PostgreSQL + pgvector 存向量数据。两库通过 project_id 关联。

## 2.1 MySQL 核心表

### 2.1.1 projects（项目表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| name | VARCHAR(100) | NOT NULL | 项目名称 |
| description | TEXT |  | 项目描述 |
| owner_id | BIGINT | FK → users.id | 项目所有者 |
| status | TINYINT | DEFAULT 1 | 1=活跃 0=归档 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

### 2.1.2 project_summaries（项目摘要表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| project_id | BIGINT | FK NOT NULL | 关联项目 |
| content | TEXT | NOT NULL | 摘要内容（结构化文本） |
| version | INT | DEFAULT 1 | 版本号，每次更新递增 |
| is_current | TINYINT | DEFAULT 1 | 1=当前版本 |
| created_at | DATETIME | NOT NULL | 创建时间 |

  📌  查询当前摘要：WHERE project_id=? AND is_current=1；更新时先将旧版本 is_current 置 0。

### 2.1.3 test_cases（测试用例表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| project_id | BIGINT | FK NOT NULL | 所属项目 |
| title | VARCHAR(255) | NOT NULL | 用例标题 |
| precondition | TEXT |  | 前置条件 |
| steps | JSON | NOT NULL | 执行步骤数组 |
| expected | TEXT | NOT NULL | 预期结果 |
| priority | TINYINT | DEFAULT 1 | 0=P0 1=P1 2=P2 |
| source | VARCHAR(20) | DEFAULT 'ai' | 'ai' 或 'manual' |
| stage_e1 | JSON |  | E1 阶段产出快照 |
| stage_e2 | JSON |  | E2 阶段产出快照 |
| vectorized | TINYINT | DEFAULT 0 | 是否已向量化入库 |
| created_by | BIGINT | FK → users.id | 创建人 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

### 2.1.4 generation_tasks（生成任务表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | VARCHAR(36) | PK | UUID，前端订阅 SSE 用 |
| project_id | BIGINT | FK NOT NULL | 所属项目 |
| mode | VARCHAR(10) | NOT NULL | 'auto' 或 'step' |
| status | VARCHAR(20) | NOT NULL | pending/e1/e2/e3/critic/done/failed |
| current_stage | VARCHAR(5) |  | 当前阶段 e1/e2/e3 |
| input_content | TEXT | NOT NULL | 用户输入的需求描述 |
| e1_result | JSON |  | E1 产出 |
| e2_result | JSON |  | E2 产出 |
| e3_result | JSON |  | E3 用例草稿 |
| critic_score | INT |  | 质量得分 0~100 |
| retry_count | TINYINT | DEFAULT 0 | Critic 重试次数 |
| created_at | DATETIME | NOT NULL |  |
| completed_at | DATETIME |  | 完成时间 |

## 2.2 pgvector 向量表

### 2.2.1 knowledge_chunks

**SQL DDL**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (

  id        BIGSERIAL PRIMARY KEY,

  project_id BIGINT NOT NULL,

  source_type VARCHAR(20) NOT NULL,  -- 'history_case' | 'spec_doc' | 'glossary'

  source_id  BIGINT,                 -- 关联 test_cases.id 或文档ID

  content    TEXT NOT NULL,

  embedding  vector(1536) NOT NULL,  -- OpenAI text-embedding-ada-002

  metadata   JSONB,

  created_at TIMESTAMP DEFAULT NOW()

);

-- 向量索引（IVFFlat，适合百万级以下数据量）

CREATE INDEX idx_chunks_embedding ON knowledge_chunks

  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

```sql
-- project_id 过滤索引
CREATE INDEX idx_chunks_project ON knowledge_chunks(project_id, source_type);
```

# 3. 后端 API 设计

  📌  统一响应格式：{ code: 0, message: 'ok', data: {} }；错误时 code 非 0，message 为错误描述。

## 3.1 项目管理 API

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | /api/v1/projects | 创建项目 | 登录用户 |
| GET | /api/v1/projects | 获取项目列表 | 登录用户 |
| GET | /api/v1/projects/{id} | 获取项目详情 | 项目成员 |
| PUT | /api/v1/projects/{id} | 更新项目信息 | Owner/Editor |
| DELETE | /api/v1/projects/{id} | 归档项目 | Owner |
| GET | /api/v1/projects/{id}/summary | 获取当前摘要 | 项目成员 |
| POST | /api/v1/projects/{id}/summary/refresh | 手动刷新摘要 | Owner/Editor |

### POST /api/v1/projects 请求/响应

**Request Body**

```json
{ "name": "电商平台", "description": "B2C 电商系统测试项目" }
```

**Response 201**

```json
{
  "code": 0,
  "data": {
    "id": 1, "name": "电商平台",
    "owner_id": 100, "status": 1,
    "created_at": "2026-04-25T10:00:00Z"
  }
}
```

## 3.2 摘要 Agent API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/v1/projects/{id}/documents | 上传 PRD 文档（触发摘要更新） |
| GET | /api/v1/projects/{id}/summary | 获取当前摘要及版本号 |
| GET | /api/v1/projects/{id}/summary/history | 获取摘要版本历史 |
| POST | /api/v1/projects/{id}/summary/rollback/{version} | 回滚到指定版本 |

### POST /api/v1/projects/{id}/documents 说明

- Content-Type: multipart/form-data，字段名 file，支持 .pdf/.docx/.md
- 上传后异步触发摘要 Agent，返回 202 Accepted + task_id
- 前端轮询 GET /api/v1/tasks/{task_id} 获取摘要更新状态

## 3.3 生成任务 API（核心）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/v1/projects/{id}/generate | 创建生成任务，返回 task_id |
| GET | /api/v1/generate/{taskId}/stream | SSE 流式订阅生成过程 |
| POST | /api/v1/generate/{taskId}/confirm | 逐步模式：确认当前阶段继续 |
| POST | /api/v1/generate/{taskId}/cancel | 取消生成任务 |
| GET | /api/v1/generate/{taskId} | 查询任务状态和结果 |

### POST /api/v1/projects/{id}/generate

**Request Body**

```json
{
  "mode": "auto",
  "input": "用户需要支持手机号登录，密码 6-20 位...",
  "prd_document_id": 5
}
```

**Response 202**

```json
{
  "code": 0,
  "data": {
    "task_id": "a3f2c1d0-....",
    "stream_url": "/api/v1/generate/a3f2c1d0-.../stream"
  }
}
```

### GET /api/v1/generate/{taskId}/stream（SSE 事件格式）

**SSE Event: e1_start**

```
data: { "event": "e1_start", "stage": "e1" }
```

**SSE Event: e1_chunk（流式内容）**

```
data: { "event": "e1_chunk", "stage": "e1", "content": "抽取到功能点：用户登录..." }
```

**SSE Event: stage_done（阶段完成，逐步模式需等待 confirm）**

```json
data: {
  "event": "stage_done",
  "stage": "e1",
  "result": { "features": [...], "constraints": [...] },
  "need_confirm": true
}
```

**SSE Event: generation_complete**

```json
data: {
  "event": "generation_complete",
  "critic_score": 88,
  "cases": [ { "title": "正确账号密码登录成功", "priority": 0, ... } ]
}
```

## 3.4 用例管理 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/v1/projects/{id}/cases | 获取用例列表（分页+过滤） |
| POST | /api/v1/projects/{id}/cases | 手动创建用例 |
| PUT | /api/v1/cases/{caseId} | 更新用例 |
| DELETE | /api/v1/cases/{caseId} | 删除用例 |
| POST | /api/v1/cases/batch-confirm | 批量确认用例（触发向量化入库） |
| POST | /api/v1/cases/export | 导出用例（JSON/CSV/Excel） |

## 3.5 RAG 知识库 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/v1/projects/{id}/knowledge | 上传知识文档（规范/术语表） |
| GET | /api/v1/projects/{id}/knowledge | 获取知识库文档列表 |
| DELETE | /api/v1/knowledge/{chunkId} | 删除知识片段 |
| POST | /api/v1/projects/{id}/knowledge/search | 手动语义检索（调试用） |

# 4. 后端核心业务逻辑

## 4.1 OrchestrationService（三阶段编排）

### 4.1.1 核心流程

| 步骤 | 动作 | 边界条件 |
| --- | --- | --- |
| 1. 组装 Prompt | 读项目摘要 + RAG Top-5 + 用户输入 | 摘要不存在则跳过；RAG 无结果则不注入 |
| 2. 调用 E1 | 需求分析 Sub-agent 流式输出 | 超时 30s 则标记 failed |
| 3. 逐步模式判断 | status=wait_confirm，挂起等待 | 超时 10min 自动取消任务 |
| 4. 调用 E2 | 测试对象 Sub-agent | 输入为 E1 JSON 结构化产出 |
| 5. 调用 E3 | 场景生成 Sub-agent 流式输出 | 流式内容实时推送 SSE |
| 6. Critic 评审 | 质量检查，score < 70 触发重试 | 最多重试 2 次，超限直接返回最后结果 |
| 7. 完成 | 推送 generation_complete 事件 | 用例写入 generation_tasks.e3_result |

### 4.1.2 Prompt 组装规范

**System Prompt 模板**

```
你是一个专业的测试用例设计专家。

【项目背景】
{project_summary}

【参考资料】（历史用例和测试规范）
{rag_context}

请严格基于以上背景进行分析，不要引入背景中未提及的假设。
```

| 字段 | 来源 | Token 预算 |
| --- | --- | --- |
| project_summary | MySQL project_summaries 表当前版本 | ≤ 800 token |
| rag_context | pgvector 检索 Top-5 chunk 拼接 | ≤ 1500 token |
| 用户输入 | 请求体 input 字段 + 关联 PRD 全文 | ≤ 4000 token |

## 4.2 SummaryAgentService（摘要 Agent）

### 4.2.1 续写规则

- 输出必须包含固定结构：【核心业务】【模块列表】【模块依赖】【待测重点】
- 模块列表中每个模块占独立条目，不得合并或删除已有模块
- 有变更的模块在末尾标注（已更新），新增模块追加到列表末尾
- 总长度超出 800 字时，压缩描述但不删除任何模块条目

### 4.2.2 Critic 校验逻辑

- 比对旧摘要模块列表与新摘要模块列表，确认所有历史模块存在
- 检查新 PRD 中出现的新功能是否已被加入模块列表
- 校验失败时：记录失败原因，重新调用摘要 Agent（最多 2 次）
- 二次失败时：保留旧摘要，告警通知，等待人工干预

## 4.3 KnowledgeService（RAG 检索）

### 4.3.1 混合检索策略

**混合检索 SQL（pgvector + 全文检索）**

```sql
SELECT content, source_type,
  (0.7 * (1 - (embedding <=> query_embedding::vector)) +
   0.3 * ts_rank(to_tsvector('chinese', content),
                  plainto_tsquery('chinese', :query))) AS score
FROM knowledge_chunks
WHERE project_id = :projectId
ORDER BY score DESC
LIMIT 5;
```

### 4.3.2 入库规范

- 历史用例入库：确认用例时异步触发，将 title+steps+expected 拼成自然语言后向量化
- 文档入库：按标题层级切片（优先 Markdown ## 标题），每片 ≤ 500 token，重叠 50 token
- 过滤噪声：排除纯排版内容，如第X页、修订历史、空白段落

# 5. 前端开发规格

## 5.1 技术栈

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Zustand | 4.x | 全局状态管理 |
| React Query | 5.x | 服务端状态 / 接口缓存 |
| Ant Design | 5.x | UI 组件库 |
| @ant-design/x | 最新 | AI 流式对话组件（Bubble/Sender） |
| EventSource API | 原生 | SSE 流式接收 |

## 5.2 核心页面与组件

### 5.2.1 GeneratePanel（生成面板，最核心）

| 子组件 | 职责 | 关键交互 |
| --- | --- | --- |
| ModeSelector | 选择自动/逐步模式 | 切换时重置任务状态 |
| InputArea | 需求描述输入 + PRD 上传 | 支持拖拽上传，最大 10MB |
| StageProgress | E1/E2/E3 进度条 | 逐步模式显示「确认继续」按钮 |
| StreamDisplay | 流式内容实时渲染 | SSE onmessage 更新 React state |
| CriticBadge | Critic 评分展示 | score < 70 显示橙色警告 |
| CasePreview | 生成用例预览列表 | 支持内联编辑后批量确认 |

### 5.2.2 SSE 接入规范

**SSE Hook 核心逻辑**

```typescript
const useGenerateStream = (taskId: string) => {
  const [stages, setStages] = useState<StageResult[]>([]);
  const [status, setStatus] = useState<TaskStatus>('pending');
  useEffect(() => {
    const es = new EventSource(`/api/v1/generate/${taskId}/stream`);
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      switch (payload.event) {
        case 'e1_chunk': appendContent('e1', payload.content); break;
        case 'stage_done': markStageDone(payload); break;
        case 'generation_complete': setStatus('done'); es.close(); break;
        case 'error': setStatus('failed'); es.close(); break;
      }
    };
    return () => es.close();
  }, [taskId]);
  return { stages, status };
};
```

### 5.2.3 逐步模式交互规范

- E1 完成后：显示结构化需求理解，底部出现「需求理解有误？修改后继续」和「确认，进入 E2」两个按钮
- E2 完成后：以可折叠列表展示测试对象清单，用户可勾选/取消测试对象后确认
- E3 完成后：展示用例草稿，进入 Critic 评审（自动），完成后展示最终结果
- 任意阶段用户点「重新生成本阶段」：携带用户修改意见重新调用该阶段 Sub-agent

## 5.3 状态管理设计

**Zustand Store 结构**

```typescript
interface GenerateStore {
  taskId: string | null;
  mode: 'auto' | 'step';
  status: 'idle' | 'pending' | 'e1' | 'e2' | 'e3' | 'critic' | 'done' | 'failed';
  e1Result: E1Result | null;
  e2Result: E2Result | null;
  e3Cases: TestCase[];
  criticScore: number | null;
  streamBuffers: Record<'e1'|'e2'|'e3', string>;
  // Actions
  startGenerate: (input: GenerateInput) => Promise<void>;
  confirmStage: (stage: 'e1'|'e2') => Promise<void>;
  resetTask: () => void;
}
```

# 6. AI 模块开发规格（Spring AI）

## 6.1 Sub-agent 接口定义

**Java 接口规范**

```java
// 统一 Sub-agent 接口
public interface SubAgent<I, O> {
    Flux<String> streamExecute(I input, AgentContext ctx);  // 流式
    O execute(I input, AgentContext ctx);                    // 同步
}
// AgentContext：携带 Prompt 三层结构
public record AgentContext(
    String projectSummary,   // 项目摘要
    String ragContext,        // RAG 召回内容
    Long projectId           // 用于 RAG 过滤
) {}
```

## 6.2 E1 需求分析 Agent Prompt

**System Prompt**

```
你是一个需求分析专家。请基于以下背景，对用户输入进行结构化分析。

输出必须为合法 JSON，格式如下：

```json
{
  "business_goals": ["目标1", "目标2"],
  "user_actions": ["操作1", "操作2"],
  "system_behaviors": ["行为1", "行为2"],
  "constraints": ["约束1", "约束2"],
  "out_of_scope": ["不测项1"]
}
```

```
不要输出 JSON 以外的任何内容。
```

## 6.3 E2 测试对象 Agent Prompt

**System Prompt**

```
你是一个测试设计专家。基于 E1 需求分析结果，将系统拆解为可测试对象。

每个测试对象必须包含：
- name: 对象名称
- type: 'function' | 'api' | 'ui' | 'data' | 'flow'
- dimensions: 需要覆盖的测试维度（如输入校验、异常处理、权限控制）
- priority: 0~2（P0 最高）

输出为 JSON 数组，不要输出任何其他内容。
```

## 6.4 E3 场景生成 Agent Prompt

**System Prompt**

```
你是一个测试用例编写专家。基于测试对象清单，生成完整的测试场景。

每条用例必须包含：
- title: 用例标题（动词+对象+结果，如「输入错误密码登录失败」）
- precondition: 前置条件
- steps: 执行步骤数组（每步以数字序号开头）
- expected: 预期结果
- priority: 0/1/2
- path_type: 'happy' | 'alternative' | 'error' | 'boundary'

覆盖要求：每个测试对象至少 1 条 happy path + 2 条异常/边界用例。
输出为 JSON 数组，流式输出时每生成一条用例输出一个完整 JSON 对象。
```

## 6.5 Critic Agent 评审逻辑

| 检查项 | 权重 | 评分规则 |
| --- | --- | --- |
| 测试对象覆盖率 | 40% | 每个 E2 对象有对应用例 +4 分/个，缺失 -4 分/个 |
| 路径类型完整性 | 30% | happy/error/boundary 三类都有得满分，缺一类 -10 分 |
| 用例可执行性 | 20% | steps 为空或 expected 模糊（含「正常」「正确」等词）-5 分/条 |
| 重复率 | 10% | 语义相似度 > 0.9 的用例对，每对 -5 分 |

  ⚠️  综合得分 < 70：触发重试，携带评审报告（哪些对象缺失/哪类路径不足）给 E3 重新生成。

# 7. 错误码规范

| 错误码 | HTTP 状态 | 说明 | 处理建议 |
| --- | --- | --- | --- |
| 0 | 200 | 成功 | — |
| 1001 | 400 | 请求参数缺失或格式错误 | 前端校验后提示用户 |
| 1002 | 401 | 未登录或 token 过期 | 跳转登录页 |
| 1003 | 403 | 无权限访问该资源 | 提示权限不足 |
| 2001 | 404 | 项目不存在 | 返回项目列表 |
| 2002 | 409 | 项目摘要更新中，请稍后 | 前端显示更新状态轮询 |
| 3001 | 422 | LLM 调用失败 | 重试一次，提示联系管理员 |
| 3002 | 422 | Critic 重试次数超限 | 返回最后一次结果，标注质量警告 |
| 3003 | 408 | 生成任务超时 | 提示网络检查或简化需求输入 |
| 4001 | 500 | 向量化入库失败 | 异步重试，不影响用例保存 |

# 8. 开发优先级与里程碑

| Sprint | 周期 | 前端任务 | 后端任务 |
| --- | --- | --- | --- |
| Sprint 1 | 第 1-2 周 | 项目创建/列表页、需求输入框、SSE 接入框架 | 项目 CRUD API、数据库初始化、Spring AI 接入 |
| Sprint 2 | 第 3-4 周 | 三阶段流式展示、自动模式完整链路 | OrchestrationService E1/E2/E3 Sub-agent |
| Sprint 3 | 第 5-6 周 | 逐步模式确认交互、用例预览编辑 | Critic Agent、重试机制、逐步模式 confirm API |
| Sprint 4 | 第 7-8 周 | 摘要状态展示、知识库管理页 | 摘要 Agent、RAG 入库/检索、向量化异步任务 |
| Sprint 5 | 第 9-10 周 | MCP 集成设置页、导出功能 | MCP 工具调用、Jira/禅道对接、导出接口 |

  📌  P0（必须完成）：Sprint 1-3 全部任务。P1（重要）：Sprint 4。P2（迭代）：Sprint 5。
