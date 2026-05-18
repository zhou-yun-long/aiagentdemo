package com.zoujuexian.aiagentdemo.service.treeify;

import com.alibaba.fastjson.JSON;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.BatchConfirmCasesRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CaseStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerationAttachmentRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerationConfig;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateHistoryDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateTaskDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.MindmapNodeDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.SaveMindmapRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TraceGraphDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyGenerationEvent;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyGenerationTask;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyMindmapNode;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProject;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyGenerationEventRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyGenerationTaskRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyMindmapNodeRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyProjectRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class TreeifyPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(TreeifyPersistenceService.class);

    private static final Set<String> PRIORITIES = Set.of("P0", "P1", "P2", "P3");
    private static final Set<String> EXECUTION_STATUSES = Set.of(
            "not_run", "running", "passed", "failed", "blocked", "skipped"
    );
    private static final int MAX_ATTACHMENT_TEXT_CHARS = 60000;
    private static final int MAX_IMAGE_DATA_URL_CHARS = 1200;

    private final TreeifyProjectRepository projectRepo;
    private final TreeifyTestCaseRepository caseRepo;
    private final TreeifyGenerationTaskRepository taskRepo;
    private final TreeifyMindmapNodeRepository mindmapRepo;
    private final TreeifyGenerationEventRepository eventRepo;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private VectorEmbeddingService vectorEmbeddingService;

    public TreeifyPersistenceService(
            TreeifyProjectRepository projectRepo,
            TreeifyTestCaseRepository caseRepo,
            TreeifyGenerationTaskRepository taskRepo,
            TreeifyMindmapNodeRepository mindmapRepo,
            TreeifyGenerationEventRepository eventRepo,
            ObjectMapper objectMapper
    ) {
        this.projectRepo = projectRepo;
        this.caseRepo = caseRepo;
        this.taskRepo = taskRepo;
        this.mindmapRepo = mindmapRepo;
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void seedDemoData() {
        if (projectRepo.count() > 0) {
            return;
        }
        ProjectDto project = createProject(new ProjectRequest("speccase 示例项目", "AI 驱动测试用例生成平台联调项目"));
        createCase(project.id(), new TestCaseRequest(
                null,
                "正确账号密码登录成功",
                "用户已注册合法账号，系统处于正常运行状态",
                List.of("打开登录页面", "输入正确的用户名和密码", "点击登录按钮"),
                "登录成功并跳转首页",
                "P0",
                List.of("Web", "AI"),
                "ai",
                "passed",
                Map.of("x", 560, "y", 120, "collapsed", false),
                null
        ));
        createCase(project.id(), new TestCaseRequest(
                null,
                "错误密码登录失败",
                "用户已注册合法账号，系统处于正常运行状态",
                List.of("打开登录页面", "输入正确用户名和错误密码", "点击登录按钮"),
                "页面提示用户名或密码错误",
                "P1",
                List.of("Web", "AI"),
                "ai",
                "failed",
                Map.of("x", 560, "y", 260, "collapsed", false),
                null
        ));
        createCase(project.id(), new TestCaseRequest(
                null,
                "空账号提交登录失败",
                "系统处于正常运行状态",
                List.of("打开登录页面", "用户名留空并输入密码", "点击登录按钮"),
                "页面提示请输入账号",
                "P1",
                List.of("Web", "AI"),
                "ai",
                "not_run",
                Map.of("x", 560, "y", 410, "collapsed", false),
                null
        ));
    }

    // ──── Project CRUD ────

    public List<ProjectDto> listProjects() {
        return projectRepo.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public ProjectDto getProject(Long projectId) {
        return toDto(findProject(projectId));
    }

    public ProjectDto createProject(ProjectRequest request) {
        String name = requireText(request == null ? null : request.name(), "项目名称不能为空");
        LocalDateTime now = LocalDateTime.now();
        TreeifyProject entity = new TreeifyProject();
        entity.setName(name);
        entity.setDescription(defaultText(request == null ? null : request.description(), ""));
        entity.setStatus("active");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return toDto(projectRepo.save(entity));
    }

    public ProjectDto updateProject(Long projectId, ProjectRequest request) {
        TreeifyProject entity = findProject(projectId);
        String name = requireText(request == null ? null : request.name(), "项目名称不能为空");
        entity.setName(name);
        entity.setDescription(defaultText(request == null ? null : request.description(), ""));
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(projectRepo.save(entity));
    }

    public ProjectDto archiveProject(Long projectId) {
        TreeifyProject entity = findProject(projectId);
        entity.setStatus("archived");
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(projectRepo.save(entity));
    }

    public TraceGraphDto getTraceability(Long projectId) {
        TreeifyProject project = findProject(projectId);
        String json = defaultText(project.getTraceabilityJson(), "").trim();
        if (json.isBlank()) {
            return emptyTraceGraph(projectId);
        }
        try {
            TraceGraphDto graph = objectMapper.readValue(json, TraceGraphDto.class);
            if (graph == null) {
                return emptyTraceGraph(projectId);
            }
            return new TraceGraphDto(
                    projectId,
                    graph.getTaskId(),
                    graph.getNodes() == null ? List.of() : graph.getNodes(),
                    graph.getEdges() == null ? List.of() : graph.getEdges(),
                    graph.getUpdatedAt() == null ? project.getUpdatedAt().toString() : graph.getUpdatedAt()
            );
        } catch (Exception ignored) {
            return emptyTraceGraph(projectId);
        }
    }

    public TraceGraphDto saveTraceability(Long projectId, TraceGraphDto request) {
        TreeifyProject project = findProject(projectId);
        TraceGraphDto graph = new TraceGraphDto(
                projectId,
                request == null ? null : request.getTaskId(),
                request == null || request.getNodes() == null ? List.of() : request.getNodes(),
                request == null || request.getEdges() == null ? List.of() : request.getEdges(),
                LocalDateTime.now().toString()
        );
        try {
            project.setTraceabilityJson(objectMapper.writeValueAsString(graph));
        } catch (Exception ex) {
            throw new BusinessException(ApiErrorCode.INTERNAL_ERROR, "保存追踪关系失败");
        }
        project.setUpdatedAt(LocalDateTime.now());
        projectRepo.save(project);
        return graph;
    }

    // ──── TestCase CRUD ────

    public List<TestCaseDto> listCases(Long projectId) {
        findProject(projectId);
        return caseRepo.findAllByProjectIdOrderById(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    public TestCaseDto createCase(Long projectId, TestCaseRequest request) {
        findProject(projectId);
        TreeifyTestCase entity = buildEntity(null, projectId, request, 1, LocalDateTime.now(), LocalDateTime.now());
        return toDto(caseRepo.save(entity));
    }

    public TestCaseDto updateCase(Long caseId, TestCaseRequest request) {
        TreeifyTestCase entity = findCase(caseId);
        if (request != null && request.version() != null && request.version() != entity.getVersion()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "用例版本已变化，请刷新后重试");
        }
        TreeifyTestCase updated = buildEntity(
                caseId,
                entity.getProjectId(),
                request,
                entity.getVersion() + 1,
                entity.getCreatedAt(),
                LocalDateTime.now()
        );
        return toDto(caseRepo.save(updated));
    }

    public void deleteCase(Long caseId) {
        TreeifyTestCase entity = findCase(caseId);
        caseRepo.delete(entity);
        deleteTestCaseVectorsSafe(caseId);
    }

    public TestCaseDto updateExecutionStatus(Long caseId, String executionStatus) {
        TreeifyTestCase entity = findCase(caseId);
        entity.setExecutionStatus(normalizeExecutionStatus(executionStatus));
        entity.setVersion(entity.getVersion() + 1);
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(caseRepo.save(entity));
    }

    public List<TestCaseDto> batchConfirm(BatchConfirmCasesRequest request) {
        if (request == null || request.projectId() == null) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "projectId 不能为空");
        }
        findProject(request.projectId());
        List<GeneratedCaseDto> generatedCases = request.cases() == null ? List.of() : request.cases();
        if (generatedCases.isEmpty()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "确认用例不能为空");
        }

        List<TestCaseDto> savedCases = new ArrayList<>();
        for (GeneratedCaseDto generatedCase : generatedCases) {
            TestCaseRequest caseRequest = new TestCaseRequest(
                    null,
                    generatedCase.title(),
                    generatedCase.precondition(),
                    generatedCase.steps(),
                    generatedCase.expected(),
                    generatedCase.priority(),
                    generatedCase.tags(),
                    defaultText(generatedCase.source(), "ai"),
                    "not_run",
                    Map.of("collapsed", false),
                    null
            );
            TestCaseDto saved = createCase(request.projectId(), caseRequest);
            savedCases.add(saved);
            embedTestCaseSafe(saved);
        }
        return savedCases;
    }

    public CaseStatsDto getCaseStats(Long projectId) {
        findProject(projectId);
        long total = caseRepo.countByProjectId(projectId);
        long measured = caseRepo.countByProjectIdAndExecutionStatusNot(projectId, "not_run");
        long passed = caseRepo.countByProjectIdAndExecutionStatus(projectId, "passed");
        double passRate = measured == 0 ? 0 : ((double) passed / measured);
        return new CaseStatsDto(total, measured, passed, passRate);
    }

    public Map<Long, CaseStatsDto> getAllProjectStats() {
        List<Object[]> rows = caseRepo.countStatsGroupedByProject();
        Map<Long, CaseStatsDto> map = new HashMap<>();
        for (Object[] row : rows) {
            Long pid = (Long) row[0];
            long total = (Long) row[1];
            long measured = (Long) row[2];
            long passed = (Long) row[3];
            double rate = measured == 0 ? 0 : (double) passed / measured;
            map.put(pid, new CaseStatsDto(total, measured, passed, rate));
        }
        return map;
    }

    public ProjectDto restoreProject(Long projectId) {
        TreeifyProject entity = findProject(projectId);
        entity.setStatus("active");
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(projectRepo.save(entity));
    }

    // ──── Mindmap CRUD ────

    public List<MindmapNodeDto> getMindmap(Long projectId) {
        findProject(projectId);
        List<MindmapNodeDto> savedNodes = mindmapRepo.findAllByProjectIdOrderByOrderIndexAscDepthAscIdAsc(projectId).stream()
                .map(this::toDto)
                .toList();
        if (!savedNodes.isEmpty()) {
            return savedNodes;
        }
        return deriveMindmapFromCases(projectId);
    }

    @Transactional
    public List<MindmapNodeDto> saveMindmap(Long projectId, SaveMindmapRequest request) {
        findProject(projectId);
        List<MindmapNodeDto> nodes = request == null || request.nodes() == null ? List.of() : request.nodes();
        mindmapRepo.deleteByProjectId(projectId);
        if (nodes.isEmpty()) {
            return List.of();
        }

        LocalDateTime now = LocalDateTime.now();
        List<TreeifyMindmapNode> entities = new ArrayList<>();
        for (int i = 0; i < nodes.size(); i++) {
            entities.add(buildMindmapEntity(projectId, nodes.get(i), i, now));
        }
        return mindmapRepo.saveAll(entities).stream()
                .map(this::toDto)
                .toList();
    }

    // ──── GenerationTask CRUD ────

    public GenerateTaskDto createGenerateTask(Long projectId, CreateGenerateTaskRequest request) {
        findProject(projectId);
        String mode = normalizeMode(request == null ? null : request.mode());
        List<GenerationAttachmentRequest> attachments = normalizeAttachments(request == null ? null : request.attachments());
        String input = defaultText(request == null ? null : request.input(), "").trim();
        if (input.isBlank() && attachments.isEmpty()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "需求输入或附件不能为空");
        }
        List<Long> contextCaseIds = normalizeContextCaseIds(request == null ? null : request.contextCaseIds());
        String selectedNodeId = defaultText(request == null ? null : request.selectedNodeId(), "");
        String taskKind = normalizeTaskKind(
                request != null && request.generationConfig() != null ? request.generationConfig().taskKind() : null
        );
        String generationInput = appendGenerationContext(
                projectId,
                input,
                selectedNodeId,
                contextCaseIds,
                attachments
        );

        String taskId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        TreeifyGenerationTask entity = new TreeifyGenerationTask();
        entity.setTaskId(taskId);
        entity.setProjectId(projectId);
        entity.setMode(mode);
        entity.setInputText(generationInput);
        entity.setSelectedNodeId(selectedNodeId.isBlank() ? null : selectedNodeId);
        entity.setContextCaseIds(contextCaseIds.isEmpty() ? null : JSON.toJSONString(contextCaseIds));
        entity.setTaskKind(taskKind);
        if (request != null && request.generationConfig() != null) {
            entity.setGenerationConfigJson(JSON.toJSONString(request.generationConfig()));
        }
        entity.setStatus("pending");
        entity.setStreamUrl("/api/v1/generate/" + taskId + "/stream");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        taskRepo.save(entity);
        return toDto(entity);
    }

    public GenerateTaskDto getTask(String taskId) {
        return toDto(findTask(taskId));
    }

    public List<GenerateHistoryDto> listGenerateTasks(Long projectId) {
        findProject(projectId);
        return taskRepo.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(this::toHistoryDto)
                .toList();
    }

    private GenerateHistoryDto toHistoryDto(TreeifyGenerationTask entity) {
        long eventCount = eventRepo.countByTaskId(entity.getTaskId());
        return new GenerateHistoryDto(
                entity.getTaskId(),
                entity.getProjectId(),
                entity.getMode(),
                entity.getStatus(),
                entity.getCurrentStage(),
                entity.getTaskKind(),
                entity.getCriticScore(),
                (int) eventCount,
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCompletedAt()
        );
    }

    public String getTaskInput(String taskId) {
        return defaultText(findTask(taskId).getInputText(), "");
    }

    public GenerationConfig getTaskGenerationConfig(String taskId) {
        return parseGenerationConfig(findTask(taskId).getGenerationConfigJson());
    }

    private List<Long> normalizeContextCaseIds(List<Long> caseIds) {
        if (caseIds == null || caseIds.isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(caseIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll));
    }

    private String appendGenerationContext(Long projectId, String input, String selectedNodeId,
                                           List<Long> contextCaseIds,
                                           List<GenerationAttachmentRequest> attachments) {
        List<GenerationAttachmentRequest> safeAttachments = normalizeAttachments(attachments);
        if (contextCaseIds.isEmpty() && selectedNodeId.isBlank() && safeAttachments.isEmpty()) {
            return input;
        }

        StringBuilder context = new StringBuilder();
        if (!selectedNodeId.isBlank()) {
            context.append("当前选中节点：").append(selectedNodeId).append('\n');
        }

        List<TreeifyTestCase> contextCases = contextCaseIds.isEmpty()
                ? List.of()
                : caseRepo.findAllById(contextCaseIds).stream()
                .filter(testCase -> projectId.equals(testCase.getProjectId()))
                .toList();

        if (!contextCases.isEmpty()) {
            context.append("关联用例上下文：\n");
            for (TreeifyTestCase testCase : contextCases) {
                context.append("- #").append(testCase.getId())
                        .append(" ").append(defaultText(testCase.getTitle(), "未命名用例"))
                        .append("，优先级=").append(defaultText(testCase.getPriority(), "P1"))
                        .append("，执行状态=").append(defaultText(testCase.getExecutionStatus(), "not_run"))
                        .append("\n  前置条件：").append(defaultText(testCase.getPrecondition(), "无"))
                        .append("\n  步骤：").append(String.join("；", testCase.getSteps() == null ? List.of() : testCase.getSteps()))
                        .append("\n  预期：").append(defaultText(testCase.getExpected(), "无"))
                        .append("\n");
            }
        }

        appendAttachmentContext(context, safeAttachments);

        if (context.length() == 0) {
            return input;
        }
        return input + "\n\n【当前工作台上下文】\n" + context
                + "请优先围绕当前选区和关联用例补充、扩展或修正测试覆盖。";
    }

    private List<GenerationAttachmentRequest> normalizeAttachments(List<GenerationAttachmentRequest> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return List.of();
        }
        return attachments.stream()
                .filter(attachment -> attachment != null && attachment.fileName() != null && !attachment.fileName().isBlank())
                .toList();
    }

    private void appendAttachmentContext(StringBuilder context, List<GenerationAttachmentRequest> attachments) {
        if (attachments.isEmpty()) {
            return;
        }

        context.append("生成附件：\n");
        for (GenerationAttachmentRequest attachment : attachments) {
            String kind = defaultText(attachment.kind(), "document");
            String fileName = defaultText(attachment.fileName(), "未命名附件").trim();
            String contentType = defaultText(attachment.contentType(), "application/octet-stream");
            long size = attachment.size() == null ? 0 : Math.max(0, attachment.size());
            context.append("- ").append("image".equals(kind) ? "图片" : "文档")
                    .append("：").append(fileName)
                    .append("，类型=").append(contentType)
                    .append("，大小=").append(size).append(" bytes")
                    .append('\n');

            String attachmentId = defaultText(attachment.attachmentId(), "").trim();
            if (attachmentId.isBlank()) {
                context.append("  内容：该附件未提供 attachmentId，请结合文件名和用户输入理解。\n");
                continue;
            }

            if ("image".equals(kind)) {
                context.append("  图片附件ID：").append(attachmentId)
                        .append("\n  说明：当前三阶段文字链路会保留图片附件信息；若模型不支持视觉输入，请依据文件名和用户补充说明生成用例。\n");
            } else {
                context.append("  文档附件ID：").append(attachmentId).append('\n');
            }
        }
    }

    private String truncateText(String value, int limit) {
        if (value == null || value.length() <= limit) {
            return defaultText(value, "");
        }
        return value.substring(0, limit) + "\n...[内容已截断]";
    }

    private List<Long> parseContextCaseIds(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return JSON.parseArray(value, Long.class);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    public void saveStageResult(String taskId, String stage, String resultJson) {
        TreeifyGenerationTask entity = findTask(taskId);
        if ("e1".equals(stage)) {
            entity.setE1Result(resultJson);
        } else if ("e2".equals(stage)) {
            entity.setE2Result(resultJson);
        }
        entity.setUpdatedAt(LocalDateTime.now());
        taskRepo.save(entity);
    }

    public void saveFeedback(String taskId, String feedback) {
        TreeifyGenerationTask entity = findTask(taskId);
        entity.setFeedback(feedback);
        entity.setUpdatedAt(LocalDateTime.now());
        taskRepo.save(entity);
    }

    public GenerateTaskDto updateTaskStatus(
            String taskId,
            String status,
            String currentStage,
            Integer criticScore,
            LocalDateTime completedAt
    ) {
        TreeifyGenerationTask entity = findTask(taskId);
        entity.setStatus(status);
        entity.setCurrentStage(currentStage);
        entity.setCriticScore(criticScore);
        entity.setUpdatedAt(LocalDateTime.now());
        if (completedAt != null) {
            entity.setCompletedAt(completedAt);
        }
        return toDto(taskRepo.save(entity));
    }

    // ──── Entity helpers ────

    public TreeifyProject findProject(Long projectId) {
        return projectRepo.findById(projectId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "项目不存在: " + projectId));
    }

    private TreeifyTestCase findCase(Long caseId) {
        return caseRepo.findById(caseId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId));
    }

    private TreeifyGenerationTask findTask(String taskId) {
        return taskRepo.findById(taskId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "生成任务不存在: " + taskId));
    }

    private TraceGraphDto emptyTraceGraph(Long projectId) {
        return new TraceGraphDto(projectId, null, List.of(), List.of(), LocalDateTime.now().toString());
    }

    // ──── Entity → DTO converters ────

    private ProjectDto toDto(TreeifyProject entity) {
        return new ProjectDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private TestCaseDto toDto(TreeifyTestCase entity) {
        return new TestCaseDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getParentId(),
                entity.getTitle(),
                entity.getPrecondition(),
                entity.getSteps() == null ? List.of() : List.copyOf(entity.getSteps()),
                entity.getExpected(),
                entity.getPriority(),
                entity.getTags() == null ? List.of() : List.copyOf(entity.getTags()),
                entity.getSource(),
                entity.getExecutionStatus(),
                entity.getReviewStatus(),
                entity.getLayout() == null ? Map.of("collapsed", false) : Map.copyOf(entity.getLayout()),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private GenerateTaskDto toDto(TreeifyGenerationTask entity) {
        return new GenerateTaskDto(
                entity.getTaskId(),
                entity.getProjectId(),
                entity.getMode(),
                entity.getStatus(),
                entity.getCurrentStage(),
                entity.getStreamUrl(),
                entity.getCriticScore(),
                entity.getSelectedNodeId(),
                parseContextCaseIds(entity.getContextCaseIds()),
                entity.getTaskKind(),
                entity.getE1Result(),
                entity.getE2Result(),
                entity.getFeedback(),
                parseGenerationConfig(entity.getGenerationConfigJson()),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCompletedAt()
        );
    }

    private GenerationConfig parseGenerationConfig(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return JSON.parseObject(json, GenerationConfig.class);
        } catch (Exception e) {
            return null;
        }
    }

    private MindmapNodeDto toDto(TreeifyMindmapNode entity) {
        return new MindmapNodeDto(
                entity.getId(),
                entity.getParentId(),
                entity.getCaseId(),
                String.valueOf(entity.getProjectId()),
                entity.getTitle(),
                entity.getKind(),
                entity.getPriority(),
                entity.getTags() == null ? List.of() : List.copyOf(entity.getTags()),
                entity.getStatus(),
                entity.getExecutionStatus(),
                entity.getSource(),
                entity.getVersion(),
                entity.getLane(),
                entity.getDepth(),
                entity.getOrderIndex(),
                entity.getFontFamily(),
                entity.getFontSize(),
                entity.getFontWeight(),
                entity.getLayout() == null ? Map.of() : Map.copyOf(entity.getLayout())
        );
    }

    // ──── Build entity from request ────

    private TreeifyTestCase buildEntity(
            Long caseId,
            Long projectId,
            TestCaseRequest request,
            int version,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        if (request == null) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "用例请求不能为空");
        }
        String title = requireText(request.title(), "用例标题不能为空");
        List<String> steps = request.steps() == null ? List.of() : request.steps().stream()
                .filter(step -> step != null && !step.isBlank())
                .toList();
        if (steps.isEmpty()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "执行步骤不能为空");
        }
        requireText(request.expected(), "预期结果不能为空");

        TreeifyTestCase entity = new TreeifyTestCase();
        if (caseId != null) {
            entity.setId(caseId);
        }
        entity.setProjectId(projectId);
        entity.setParentId(request.parentId());
        entity.setTitle(title);
        entity.setPrecondition(defaultText(request.precondition(), ""));
        entity.setSteps(steps);
        entity.setExpected(request.expected().trim());
        entity.setPriority(normalizePriority(request.priority()));
        entity.setTags(request.tags() == null ? List.of() : List.copyOf(request.tags()));
        entity.setSource(defaultText(request.source(), "manual"));
        entity.setExecutionStatus(normalizeExecutionStatus(request.executionStatus()));
        entity.setLayout(request.layout() == null ? Map.of("collapsed", false) : Map.copyOf(request.layout()));
        entity.setVersion(version);
        entity.setCreatedAt(createdAt);
        entity.setUpdatedAt(updatedAt);
        return entity;
    }

    private TreeifyMindmapNode buildMindmapEntity(Long projectId, MindmapNodeDto node, int fallbackOrder, LocalDateTime now) {
        if (node == null) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "脑图节点不能为空");
        }
        TreeifyMindmapNode entity = new TreeifyMindmapNode();
        entity.setId(requireText(node.id(), "脑图节点 id 不能为空"));
        entity.setProjectId(projectId);
        entity.setParentId(blankToNull(node.parentId()));
        entity.setCaseId(blankToNull(node.caseId()));
        entity.setTitle(requireText(node.title(), "脑图节点标题不能为空"));
        entity.setKind(requireText(node.kind(), "脑图节点类型不能为空"));
        entity.setPriority(blankToNull(node.priority()));
        entity.setTags(node.tags() == null ? List.of() : List.copyOf(node.tags()));
        entity.setStatus(blankToNull(node.status()));
        entity.setExecutionStatus(blankToNull(node.executionStatus()));
        entity.setSource(defaultText(node.source(), "manual"));
        entity.setVersion(node.version() == null ? 1 : node.version());
        entity.setLane(defaultText(node.lane(), "middle"));
        entity.setDepth(node.depth() == null ? 0 : node.depth());
        entity.setOrderIndex(node.order() == null ? fallbackOrder : node.order());
        entity.setFontFamily(blankToNull(node.fontFamily()));
        entity.setFontSize(node.fontSize());
        entity.setFontWeight(node.fontWeight());
        entity.setLayout(node.layout() == null ? Map.of() : Map.copyOf(node.layout()));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return entity;
    }

    private List<MindmapNodeDto> deriveMindmapFromCases(Long projectId) {
        List<TestCaseDto> testCases = listCases(projectId);
        List<MindmapNodeDto> nodes = new ArrayList<>();
        String[] lanes = {"upper", "middle", "lower"};
        for (int i = 0; i < testCases.size(); i++) {
            TestCaseDto testCase = testCases.get(i);
            String lane = lanes[i % lanes.length];
            int order = i / lanes.length;
            String caseNodeId = "api-case-" + testCase.id();
            String stepNodeId = caseNodeId + "-steps";
            String source = "ai".equals(testCase.source()) ? "ai" : "manual";
            String status = switch (testCase.executionStatus()) {
                case "passed" -> "pass";
                case "failed" -> "fail";
                default -> "warn";
            };
            nodes.add(new MindmapNodeDto(
                    caseNodeId,
                    null,
                    String.valueOf(testCase.id()),
                    String.valueOf(testCase.projectId()),
                    testCase.title(),
                    "case",
                    testCase.priority(),
                    testCase.tags(),
                    status,
                    testCase.executionStatus(),
                    source,
                    testCase.version(),
                    lane,
                    2,
                    order,
                    null,
                    null,
                    null,
                    testCase.layout()
            ));
            nodes.add(new MindmapNodeDto(
                    caseNodeId + "-condition",
                    caseNodeId,
                    String.valueOf(testCase.id()),
                    String.valueOf(testCase.projectId()),
                    defaultText(testCase.precondition(), "无前置条件"),
                    "condition",
                    null,
                    List.of("前置条件"),
                    null,
                    null,
                    source,
                    testCase.version(),
                    lane,
                    3,
                    0,
                    null,
                    null,
                    null,
                    Map.of()
            ));
            nodes.add(new MindmapNodeDto(
                    stepNodeId,
                    caseNodeId + "-condition",
                    String.valueOf(testCase.id()),
                    String.valueOf(testCase.projectId()),
                    formatStepList(testCase.steps()),
                    "step",
                    null,
                    List.of("执行步骤"),
                    null,
                    null,
                    source,
                    testCase.version(),
                    lane,
                    4,
                    0,
                    null,
                    null,
                    null,
                    Map.of()
            ));
            nodes.add(new MindmapNodeDto(
                    caseNodeId + "-expected",
                    stepNodeId,
                    String.valueOf(testCase.id()),
                    String.valueOf(testCase.projectId()),
                    testCase.expected(),
                    "expected",
                    null,
                    List.of("预期结果"),
                    null,
                    null,
                    source,
                    testCase.version(),
                    lane,
                    5,
                    0,
                    null,
                    null,
                    null,
                    Map.of()
            ));
        }
        return nodes;
    }

    private String formatStepList(List<String> steps) {
        List<String> normalized = steps == null ? List.of() : steps.stream()
                .filter(step -> step != null && !step.isBlank())
                .map(step -> step.trim().replaceFirst("^\\d+[.)、]\\s*", ""))
                .toList();
        if (normalized.isEmpty()) {
            return "补充执行步骤";
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < normalized.size(); i++) {
            if (i > 0) {
                builder.append('\n');
            }
            builder.append(i + 1).append('.').append(normalized.get(i));
        }
        return builder.toString();
    }

    // ──── Generation Event persistence ────

    @Transactional
    public void persistEvent(String taskId, String eventName, String stage, long sequence, String payloadJson) {
        TreeifyGenerationEvent event = new TreeifyGenerationEvent(taskId, eventName, stage, sequence, payloadJson);
        eventRepo.save(event);
    }

    public List<TreeifyGenerationEvent> replayEvents(String taskId) {
        return eventRepo.findAllByTaskIdOrderBySequenceAsc(taskId);
    }

    // ──── Vector embedding helpers ────

    private void embedTestCaseSafe(TestCaseDto testCase) {
        if (vectorEmbeddingService == null) {
            return;
        }
        try {
            String content = buildTestCaseContent(testCase);
            vectorEmbeddingService.embedTestCase(testCase.projectId(), testCase.id(), content, testCase.title());
        } catch (Exception e) {
            log.warn("Failed to embed test case id={}, skipping vector store: {}", testCase.id(), e.getMessage());
        }
    }

    private void deleteTestCaseVectorsSafe(Long caseId) {
        if (vectorEmbeddingService == null) {
            return;
        }
        try {
            vectorEmbeddingService.deleteByTestCaseId(caseId);
        } catch (Exception e) {
            log.warn("Failed to delete vectors for test case id={}: {}", caseId, e.getMessage());
        }
    }

    private String buildTestCaseContent(TestCaseDto testCase) {
        StringBuilder sb = new StringBuilder();
        sb.append("标题：").append(defaultText(testCase.title(), ""));
        String precondition = testCase.precondition();
        if (precondition != null && !precondition.isBlank()) {
            sb.append("\n前置条件：").append(precondition);
        }
        List<String> steps = testCase.steps();
        if (steps != null && !steps.isEmpty()) {
            sb.append("\n执行步骤：");
            for (int i = 0; i < steps.size(); i++) {
                sb.append("\n  ").append(i + 1).append(". ").append(defaultText(steps.get(i), ""));
            }
        }
        String expected = testCase.expected();
        if (expected != null && !expected.isBlank()) {
            sb.append("\n预期结果：").append(expected);
        }
        return sb.toString();
    }

    // ──── Validation helpers ────

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String defaultText(String value, String fallback) {
        return value == null ? fallback : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String normalizePriority(String priority) {
        String safe = defaultText(priority, "P1").trim().toUpperCase();
        if (!PRIORITIES.contains(safe)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "优先级只支持 P0/P1/P2/P3");
        }
        return safe;
    }

    private String normalizeExecutionStatus(String status) {
        String safe = defaultText(status, "not_run").trim();
        if (!EXECUTION_STATUSES.contains(safe)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "执行状态不合法: " + safe);
        }
        return safe;
    }

    private String normalizeMode(String mode) {
        String safe = defaultText(mode, "auto").trim();
        if (!"auto".equals(safe) && !"step".equals(safe)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "生成模式只支持 auto 或 step");
        }
        return safe;
    }

    private String normalizeTaskKind(String taskKind) {
        String safe = defaultText(taskKind, "cases").trim();
        if (!"cases".equals(safe) && !"points".equals(safe) && !"api_cases".equals(safe)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "taskKind 只支持 cases/points/api_cases");
        }
        return safe;
    }
}
