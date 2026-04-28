package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectSummaryDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProjectSummary;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyProjectSummaryRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SummaryService {

    private final TreeifyProjectSummaryRepository summaryRepo;
    private final TreeifyPersistenceService persistence;
    private final ChatClient chatClient;

    public SummaryService(TreeifyProjectSummaryRepository summaryRepo,
                          TreeifyPersistenceService persistence,
                          ChatClient chatClient) {
        this.summaryRepo = summaryRepo;
        this.persistence = persistence;
        this.chatClient = chatClient;
    }

    /** Get current summary for a project, or null if none exists. */
    public ProjectSummaryDto getCurrent(Long projectId) {
        persistence.findProject(projectId);
        return summaryRepo.findByProjectIdAndCurrentTrue(projectId)
                .map(this::toDto)
                .orElse(null);
    }

    /** Get summary version history. */
    public List<ProjectSummaryDto> getHistory(Long projectId) {
        persistence.findProject(projectId);
        return summaryRepo.findAllByProjectIdOrderByVersionDesc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    /** Generate a new summary from project context (cases + existing summary). */
    @Transactional
    public ProjectSummaryDto generate(Long projectId, String additionalContext) {
        persistence.findProject(projectId);

        // Get existing current summary
        String existingSummary = summaryRepo.findByProjectIdAndCurrentTrue(projectId)
                .map(TreeifyProjectSummary::getContent)
                .orElse("");

        // Get existing cases as context
        String casesContext = buildCasesContext(projectId);

        // Generate new summary via LLM (or mock)
        String newSummary = callLlmForSummary(existingSummary, casesContext, additionalContext);

        // Mark old current as not current
        summaryRepo.findByProjectIdAndCurrentTrue(projectId)
                .ifPresent(old -> {
                    old.setCurrent(false);
                    summaryRepo.save(old);
                });

        // Determine next version
        int nextVersion = summaryRepo.findAllByProjectIdOrderByVersionDesc(projectId).stream()
                .mapToInt(TreeifyProjectSummary::getVersion)
                .max()
                .orElse(0) + 1;

        // Save new summary
        TreeifyProjectSummary entity = new TreeifyProjectSummary(projectId, newSummary, nextVersion, true);
        summaryRepo.save(entity);
        return toDto(entity);
    }

    /** Rollback to a specific version. */
    @Transactional
    public ProjectSummaryDto rollback(Long projectId, int version) {
        persistence.findProject(projectId);

        TreeifyProjectSummary target = summaryRepo.findAllByProjectIdOrderByVersionDesc(projectId).stream()
                .filter(s -> s.getVersion() == version)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Summary version not found: " + version));

        // Mark all as not current
        summaryRepo.findByProjectIdAndCurrentTrue(projectId)
                .ifPresent(old -> {
                    old.setCurrent(false);
                    summaryRepo.save(old);
                });

        // Create a new version based on the target
        int nextVersion = summaryRepo.findAllByProjectIdOrderByVersionDesc(projectId).stream()
                .mapToInt(TreeifyProjectSummary::getVersion)
                .max()
                .orElse(0) + 1;

        TreeifyProjectSummary rollback = new TreeifyProjectSummary(projectId, target.getContent(), nextVersion, true);
        summaryRepo.save(rollback);
        return toDto(rollback);
    }

    private String buildCasesContext(Long projectId) {
        var cases = persistence.listCases(projectId);
        if (cases.isEmpty()) return "暂无已有用例";
        StringBuilder sb = new StringBuilder("已有测试用例：\n");
        for (var c : cases) {
            sb.append("- ").append(c.getTitle()).append(" [").append(c.getPriority()).append("]\n");
        }
        return sb.toString();
    }

    private String callLlmForSummary(String existingSummary, String casesContext, String additionalContext) {
        String prompt = """
                你是一个专业的测试项目分析师。请根据以下信息，生成项目摘要。

                %s

                %s

                %s

                请生成结构化摘要，包含：
                - 核心业务：一句话描述项目核心业务
                - 模块列表：列出所有功能模块
                - 模块依赖：模块间的依赖关系
                - 待测重点：需要重点关注的测试区域

                摘要不超过 800 字。只返回摘要文本，不要添加其他说明。
                """.formatted(
                        existingSummary.isEmpty() ? "这是新项目的首次摘要生成。" : "现有摘要：\n" + existingSummary,
                        casesContext,
                        additionalContext == null || additionalContext.isBlank() ? "" : "新增需求/文档：\n" + additionalContext
                );
        try {
            String response = chatClient.prompt().user(prompt).call().content();
            return response != null && !response.isBlank() ? response.trim() : mockSummary();
        } catch (Exception e) {
            return mockSummary();
        }
    }

    private String mockSummary() {
        return """
                [核心业务] 测试用例管理与 AI 辅助生成平台
                [模块列表] 用户登录、测试用例管理、思维导图、AI 生成、用例执行
                [模块依赖] 登录→用例管理→思维导图；AI 生成→用例导入
                [待测重点] AI 生成质量、用例持久化、执行状态流转
                """;
    }

    private ProjectSummaryDto toDto(TreeifyProjectSummary e) {
        return new ProjectSummaryDto(e.getId(), e.getProjectId(), e.getContent(), e.getVersion(), e.isCurrent(), e.getCreatedAt());
    }
}
