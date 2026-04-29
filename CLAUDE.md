# CLAUDE.md

## Git 分支策略

- 小改动（清理代码、修 bug、小功能）→ 直接提交到 main
- 大功能（多文件重构、新模块）→ 单独建 feature 分支，完成后再合并
- 不要每个小任务都创建新分支

## 项目结构

- 后端：Spring Boot 4.0.5 + H2 文件数据库 + Java 21
- 前端：React 19 + Zustand + Vite 7 + TypeScript
- Java 路径：`/opt/homebrew/opt/openjdk@21`（编译时需显式指定 JAVA_HOME）

## 编译命令

```bash
# 后端
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./mvnw -DskipTests package

# 前端
cd frontend && npm run build
```

## 提交规范

```
feat: 新功能
fix: 修复
refactor: 重构（不改行为）
docs: 文档
chore: 杂项
```
