# Wave 1 — GPT 代理派发文案

> 复制对应段落给对应 GPT 代理即可。每个代理独立分支工作，不允许修改 Files 白名单之外的文件。

---

## 代理 A — 任务 1.1：引入 Flyway，编写 V1 baseline + V2 迁移脚本

### 角色

你是后端 Java 开发者，负责为一个 Spring Boot 4.0.5 + JPA + H2 项目接入 Flyway 数据库迁移。

### 背景

项目当前使用 `spring.jpa.hibernate.ddl-auto=update` 自动建表。本次改造要求：
1. 引入 Flyway，把 `ddl-auto` 改为 `validate`（启动时只校验不建表）。
2. 编写 V1 baseline 脚本（锁定现有 8 张表的 CREATE TABLE）。
3. 编写 V2 迁移脚本（新增 4 张表 + 既有表 ALTER）。

### 你只允许修改以下文件

- `pom.xml`（加 flyway-core + flyway-mysql 依赖）
- `src/main/resources/application.properties`（改 ddl-auto=validate，加 flyway 配置）
- `src/main/resources/db/migration/V1__baseline.sql`（新建）
- `src/main/resources/db/migration/V2__testing_platform_revamp.sql`（新建）

### V2 脚本必须包含

```sql
-- 新增表
CREATE TABLE treeify_test_plan (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id   BIGINT NOT NULL,
  name         VARCHAR(200) NOT NULL,
  description  CLOB,
  status       VARCHAR(16) NOT NULL DEFAULT 'draft',
  start_date   TIMESTAMP,
  end_date     TIMESTAMP,
  owner_id     BIGINT,
  created_at   TIMESTAMP NOT NULL,
  updated_at   TIMESTAMP NOT NULL
);
CREATE INDEX idx_treeify_test_plan_project ON treeify_test_plan(project_id, status);

CREATE TABLE treeify_plan_case (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  plan_id           BIGINT NOT NULL,
  case_id           BIGINT NOT NULL,
  assignee_id       BIGINT,
  execution_result  VARCHAR(16),
  note              CLOB,
  created_at        TIMESTAMP NOT NULL,
  updated_at        TIMESTAMP NOT NULL,
  CONSTRAINT uq_plan_case UNIQUE (plan_id, case_id)
);
CREATE INDEX idx_plan_case_plan ON treeify_plan_case(plan_id);
CREATE INDEX idx_plan_case_case ON treeify_plan_case(case_id);

CREATE TABLE treeify_test_report (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id   BIGINT NOT NULL,
  plan_id      BIGINT NOT NULL,
  name         VARCHAR(200) NOT NULL,
  summary_json CLOB NOT NULL,
  created_at   TIMESTAMP NOT NULL,
  created_by   BIGINT
);
CREATE INDEX idx_treeify_test_report_project ON treeify_test_report(project_id, plan_id);

CREATE TABLE treeify_attachment (
  attachment_id VARCHAR(40) PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  content_type  VARCHAR(128) NOT NULL,
  size          BIGINT NOT NULL,
  storage_path  VARCHAR(512) NOT NULL,
  purpose       VARCHAR(32) NOT NULL DEFAULT 'requirement',
  created_at    TIMESTAMP NOT NULL
);
CREATE INDEX idx_treeify_attachment_project ON treeify_attachment(project_id, purpose);

-- 既有表 ALTER
ALTER TABLE treeify_generation_task ADD COLUMN config_json CLOB;
ALTER TABLE treeify_test_case ADD COLUMN granularity VARCHAR(8);
ALTER TABLE treeify_test_case ADD COLUMN platforms VARCHAR(512);
ALTER TABLE treeify_test_case ADD COLUMN scenario_tags VARCHAR(512);
```

### V1 脚本要求

反向导出现有 8 张表的 CREATE TABLE（H2 语法）。现有表名：
- treeify_project
- treeify_test_case
- treeify_generation_task
- treeify_generation_event
- treeify_mindmap_node
- treeify_project_share
- treeify_project_summary
- treeify_case_snapshot

你需要根据项目中 `domain/entity/` 下的 JPA 实体类推导出每张表的列定义。如果无法确定某列类型，使用 H2 兼容的保守类型（VARCHAR(255) / CLOB / BIGINT / TIMESTAMP）。

### application.properties 变更

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=0
```

注意 `baseline-version=0` 使得 V1 会被执行（而非跳过）。

### pom.xml 变更

在 `<dependencies>` 中加：

```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
```

不需要 `flyway-mysql`（当前用 H2，MySQL 支持留后续）。

### 验收标准

1. `mvn -DskipTests package` 编译通过
2. 删除 `data/treeify*` 后启动应用，`flyway_schema_history` 表出现 V1 + V2 两条记录
3. 启动不报 `SchemaManagementException`（validate 通过）
4. V2 脚本中 4 张新表 + 3 个 ALTER 全部生效

### 关联需求

Requirements 15.1, 15.2, 15.3

---

## 代理 B — 任务 0.3：新增 projectNavStore + 任务 0.4：占位骨架页面

### 角色

你是前端 React/TypeScript 开发者，负责为一个 React 19 + Zustand 5 + react-router-dom 7 项目新增导航状态管理和占位页面。

### 任务 0.3：projectNavStore

#### 你只允许创建以下文件

- `frontend/src/features/navigation/projectNavStore.ts`（新建）

#### 实现要求

```typescript
import { create } from 'zustand';

interface ProjectNavStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// localStorage key: 'testing-platform.sidebar.collapsed'
// 初始化时从 localStorage 读取，默认 false
// 每次 set/toggle 时同步写入 localStorage
```

#### 验收标准

1. `sidebarCollapsed` 默认 false
2. `toggleSidebar()` 反转后写入 localStorage key `testing-platform.sidebar.collapsed`
3. 刷新页面后 store 初始化值与 localStorage 一致
4. 不触发未订阅组件的重新渲染（Zustand 默认行为，无需额外处理）

#### 关联需求

Requirements 2.7, 2.9

---

### 任务 0.4：占位骨架页面

#### 你只允许创建以下文件

- `frontend/src/pages/DashboardPage.tsx`（新建）
- `frontend/src/pages/PlansPage.tsx`（新建）
- `frontend/src/pages/PlanDetailPage.tsx`（新建）
- `frontend/src/pages/ReportsPage.tsx`（新建）
- `frontend/src/pages/ReportDetailPage.tsx`（新建）

#### 实现要求

每个页面是一个简单的 React 函数组件，渲染：
- 页面标题（如「仪表盘」「测试计划」「测试报告」）
- 一个空状态提示（如「模块开发中，即将上线」）
- 使用 lucide-react 图标装饰

示例结构：

```tsx
import { BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="page-placeholder">
      <BarChart3 size={48} />
      <h2>仪表盘</h2>
      <p>模块开发中，即将上线</p>
    </div>
  );
}
```

每个页面使用不同的图标和标题：
- DashboardPage → `BarChart3` + 「仪表盘」
- PlansPage → `ClipboardList` + 「测试计划」
- PlanDetailPage → `ClipboardCheck` + 「计划详情」（从 URL 读 `useParams().planId` 展示）
- ReportsPage → `FileBarChart` + 「测试报告」
- ReportDetailPage → `FileText` + 「报告详情」

#### 验收标准

1. 每个页面 export default 一个函数组件
2. 不依赖任何后端接口
3. 不引入新的 npm 依赖（lucide-react 已安装）
4. TypeScript 编译无错误

#### 关联需求

Requirements 3.1, 10.1, 11.1

---

## 代理 C — 任务 0.6：LegacyRedirect 单测

### 角色

你是前端测试工程师，负责为一个 React 19 + react-router-dom 7 项目编写路由重定向的单元测试。

### 背景

项目将新增一个 `LegacyRedirect` 组件，负责把旧 URL 重定向到新路由：
- `/?projectId=N` → `/projects/N/cases`
- `/cases?projectId=N` → `/projects/N/cases`
- 缺省 query 时 `/` → `/projects`

### 你只允许创建以下文件

- `frontend/src/components/__tests__/LegacyRedirect.test.tsx`（新建）

### 测试框架

项目当前没有 vitest 配置。你需要：
1. 在测试文件顶部注释说明需要安装 `vitest` + `@testing-library/react` + `@testing-library/jest-dom`（但不要修改 package.json，那是主作者的事）
2. 用 `MemoryRouter` 模拟路由环境
3. 测试 `LegacyRedirect` 组件的重定向行为

### 测试用例

```typescript
// 测试 1: /?projectId=1 → /projects/1/cases
// 测试 2: /cases?projectId=2 → /projects/2/cases
// 测试 3: /?projectId=abc (非数字) → /projects
// 测试 4: / (无 query) → /projects
// 测试 5: /cases (无 query) → /projects
```

### 组件接口假设

`LegacyRedirect` 组件不接受 props，内部使用 `useLocation()` + `useSearchParams()` 读取当前 URL，然后 `<Navigate to="..." replace />` 重定向。

### 验收标准

1. 5 个测试用例覆盖上述场景
2. TypeScript 编译无错误
3. 测试逻辑清晰，每个 test 有描述性名称

### 关联需求

Requirements 12.1, 12.2

---

## 通用约束（三个代理都必须遵守）

1. **只允许修改 Files 白名单中的文件**，不许新建未列出的文件，不许修改其他文件。
2. **错误必须经 `ApiErrorCode` + `BusinessException`**（后端任务适用）。
3. **不引入新的 npm / Maven 依赖**，除非任务明确要求（如 1.1 的 flyway-core）。
4. **代码风格**：后端遵循现有 Java record 风格；前端遵循现有 TypeScript + 函数组件风格。
5. **交付时附上验收标准的验证结果**（命令输出 / 截图 / 代码片段证明）。

## 参考文档

- requirements.md：16 条 EARS 需求
- design.md：完整技术设计（含 DTO 契约、DDL、路由图、Pipeline 图、并行计划）

请在开始前通读 design.md 中与你任务相关的章节。
