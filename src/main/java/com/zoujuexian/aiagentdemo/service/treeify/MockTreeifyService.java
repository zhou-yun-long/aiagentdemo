package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_CHUNK;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.BatchConfirmCasesRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CaseStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ConfirmGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateTaskDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory speccase mock service for frontend/backend contract development.
 */
@Service
public class MockTreeifyService {

    private static final Set<String> PRIORITIES = Set.of("P0", "P1", "P2", "P3");
    private static final Set<String> EXECUTION_STATUSES = Set.of(
            "not_run", "running", "passed", "failed", "blocked", "skipped"
    );

    private final AtomicLong projectIdGenerator = new AtomicLong(1);
    private final AtomicLong caseIdGenerator = new AtomicLong(1000);

    private final Map<Long, ProjectDto> projects = new ConcurrentHashMap<>();
    private final Map<Long, TestCaseDto> casesById = new ConcurrentHashMap<>();
    private final Map<Long, List<Long>> caseIdsByProject = new ConcurrentHashMap<>();
    private final Map<String, GenerateTaskDto> tasks = new ConcurrentHashMap<>();
    private final Map<String, String> taskInputs = new ConcurrentHashMap<>();

    @PostConstruct
    public void seedData() {
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

    public List<ProjectDto> listProjects() {
        return projects.values().stream()
                .sorted(Comparator.comparing(ProjectDto::id))
                .toList();
    }

    public ProjectDto createProject(ProjectRequest request) {
        String name = requireText(request == null ? null : request.name(), "项目名称不能为空");
        LocalDateTime now = LocalDateTime.now();
        long id = projectIdGenerator.getAndIncrement();
        ProjectDto project = new ProjectDto(
                id,
                name,
                defaultText(request == null ? null : request.description(), ""),
                "active",
                now,
                now
        );
        projects.put(id, project);
        caseIdsByProject.put(id, new ArrayList<>());
        return project;
    }

    public ProjectDto getProject(Long projectId) {
        ProjectDto project = projects.get(projectId);
        if (project == null) {
            throw new BusinessException(ApiErrorCode.NOT_FOUND, "项目不存在: " + projectId);
        }
        return project;
    }

    public ProjectDto updateProject(Long projectId, ProjectRequest request) {
        ProjectDto current = getProject(projectId);
        String name = requireText(request == null ? null : request.name(), "项目名称不能为空");
        ProjectDto updated = new ProjectDto(
                current.id(),
                name,
                defaultText(request == null ? null : request.description(), ""),
                current.status(),
                current.createdAt(),
                LocalDateTime.now()
        );
        projects.put(projectId, updated);
        return updated;
    }

    public ProjectDto archiveProject(Long projectId) {
        ProjectDto current = getProject(projectId);
        ProjectDto archived = new ProjectDto(
                current.id(),
                current.name(),
                current.description(),
                "archived",
                current.createdAt(),
                LocalDateTime.now()
        );
        projects.put(projectId, archived);
        return archived;
    }

    public List<TestCaseDto> listCases(Long projectId) {
        getProject(projectId);
        return caseIdsByProject.getOrDefault(projectId, List.of()).stream()
                .map(casesById::get)
                .filter(item -> item != null)
                .sorted(Comparator.comparing(TestCaseDto::id))
                .toList();
    }

    public TestCaseDto createCase(Long projectId, TestCaseRequest request) {
        getProject(projectId);
        TestCaseDto testCase = buildCase(null, projectId, request, 1, LocalDateTime.now(), LocalDateTime.now());
        casesById.put(testCase.id(), testCase);
        caseIdsByProject.computeIfAbsent(projectId, ignored -> new ArrayList<>()).add(testCase.id());
        return testCase;
    }

    public TestCaseDto updateCase(Long caseId, TestCaseRequest request) {
        TestCaseDto current = getCase(caseId);
        if (request != null && request.version() != null && request.version() != current.version()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "用例版本已变化，请刷新后重试");
        }
        TestCaseDto updated = buildCase(caseId, current.projectId(), request, current.version() + 1, current.createdAt(), LocalDateTime.now());
        casesById.put(caseId, updated);
        return updated;
    }

    public void deleteCase(Long caseId) {
        TestCaseDto removed = casesById.remove(caseId);
        if (removed == null) {
            throw new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId);
        }
        caseIdsByProject.computeIfPresent(removed.projectId(), (projectId, ids) -> {
            ids.remove(caseId);
            return ids;
        });
    }

    public TestCaseDto updateExecutionStatus(Long caseId, String executionStatus) {
        TestCaseDto current = getCase(caseId);
        String safeStatus = normalizeExecutionStatus(executionStatus);
        TestCaseDto updated = new TestCaseDto(
                current.id(),
                current.projectId(),
                current.parentId(),
                current.title(),
                current.precondition(),
                current.steps(),
                current.expected(),
                current.priority(),
                current.tags(),
                current.source(),
                safeStatus,
                current.layout(),
                current.version() + 1,
                current.createdAt(),
                LocalDateTime.now()
        );
        casesById.put(caseId, updated);
        return updated;
    }

    public List<TestCaseDto> batchConfirm(BatchConfirmCasesRequest request) {
        if (request == null || request.projectId() == null) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "projectId 不能为空");
        }
        getProject(request.projectId());
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
            savedCases.add(createCase(request.projectId(), caseRequest));
        }
        return savedCases;
    }

    public CaseStatsDto getCaseStats(Long projectId) {
        List<TestCaseDto> testCases = listCases(projectId);
        long total = testCases.size();
        long measured = testCases.stream().filter(item -> !"not_run".equals(item.executionStatus())).count();
        long passed = testCases.stream().filter(item -> "passed".equals(item.executionStatus())).count();
        double passRate = measured == 0 ? 0 : ((double) passed / measured);
        return new CaseStatsDto(total, measured, passed, passRate);
    }

    public GenerateTaskDto createGenerateTask(Long projectId, CreateGenerateTaskRequest request) {
        getProject(projectId);
        String mode = normalizeMode(request == null ? null : request.mode());
        String input = requireText(request == null ? null : request.input(), "需求输入不能为空");

        String taskId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        GenerateTaskDto task = new GenerateTaskDto(
                taskId,
                projectId,
                mode,
                "pending",
                null,
                "/api/v1/generate/" + taskId + "/stream",
                null,
                now,
                now,
                null
        );
        tasks.put(taskId, task);
        taskInputs.put(taskId, input);
        return task;
    }

    public GenerateTaskDto getTask(String taskId) {
        GenerateTaskDto task = tasks.get(taskId);
        if (task == null) {
            throw new BusinessException(ApiErrorCode.NOT_FOUND, "生成任务不存在: " + taskId);
        }
        return task;
    }

    public GenerateTaskDto confirmTask(String taskId, ConfirmGenerateTaskRequest request) {
        GenerateTaskDto current = getTask(taskId);
        String nextStatus = "e1".equals(request == null ? null : request.stage()) ? "e2" : "e3";
        return updateTask(current, nextStatus, nextStatus, current.criticScore(), null);
    }

    public GenerateTaskDto cancelTask(String taskId) {
        GenerateTaskDto current = getTask(taskId);
        return updateTask(current, "canceled", current.currentStage(), current.criticScore(), LocalDateTime.now());
    }

    public List<GenerateSseEventDto> buildMockGenerateEvents(String taskId) {
        GenerateTaskDto task = getTask(taskId);
        MockScenario scenario = resolveScenario(taskId);
        if (!"step".equals(task.mode())) {
            return buildAutoGenerateEvents(taskId, scenario);
        }

        return switch (defaultText(task.currentStage(), "e1")) {
            case "e2" -> buildE2Events(taskId, scenario, true);
            case "e3" -> buildFinalEvents(taskId, scenario);
            case "critic" -> buildFinalEvents(taskId, scenario);
            default -> buildE1Events(taskId, scenario, true);
        };
    }

    private List<GenerateSseEventDto> buildAutoGenerateEvents(String taskId, MockScenario scenario) {
        List<GenerateSseEventDto> events = new ArrayList<>();
        events.addAll(buildE1Events(taskId, scenario, false));
        events.addAll(buildE2Events(taskId, scenario, false));
        events.addAll(buildFinalEvents(taskId, scenario));
        return events;
    }

    private List<GenerateSseEventDto> buildE1Events(String taskId, MockScenario scenario, boolean needConfirm) {
        return List.of(
                event(taskId, STAGE_STARTED, "e1", 1, Map.of("stage", "e1")),
                event(taskId, STAGE_CHUNK, "e1", 2, Map.of("content", scenario.e1Chunk())),
                event(taskId, STAGE_DONE, "e1", 3, Map.of(
                        "needConfirm", needConfirm,
                        "result", scenario.e1Result()
                ))
        );
    }

    private List<GenerateSseEventDto> buildE2Events(String taskId, MockScenario scenario, boolean needConfirm) {
        return List.of(
                event(taskId, STAGE_STARTED, "e2", 4, Map.of("stage", "e2")),
                event(taskId, STAGE_CHUNK, "e2", 5, Map.of("content", scenario.e2Chunk())),
                event(taskId, STAGE_DONE, "e2", 6, Map.of(
                        "needConfirm", needConfirm,
                        "result", scenario.e2Result()
                ))
        );
    }

    private List<GenerateSseEventDto> buildFinalEvents(String taskId, MockScenario scenario) {
        List<GeneratedCaseDto> generatedCases = scenario.cases();
        return List.of(
                event(taskId, STAGE_STARTED, "e3", 7, Map.of("stage", "e3")),
                event(taskId, STAGE_CHUNK, "e3", 8, Map.of("content", scenario.e3Chunk())),
                event(taskId, STAGE_DONE, "e3", 9, Map.of("needConfirm", false, "result", generatedCases)),
                event(taskId, STAGE_STARTED, "critic", 10, Map.of("stage", "critic")),
                event(taskId, STAGE_DONE, "critic", 11, Map.of(
                        "needConfirm", false,
                        "result", new CriticReportDto(88, List.of("覆盖了 happy/error 路径", "后续可补充密码边界长度用例"), 0)
                )),
                event(taskId, GENERATION_COMPLETE, null, 12, Map.of("criticScore", 88, "cases", generatedCases))
        );
    }

    public GenerateTaskDto applyEvent(GenerateSseEventDto event) {
        GenerateTaskDto current = getTask(event.taskId());
        return switch (event.event()) {
            case STAGE_STARTED -> updateTask(current, event.stage(), event.stage(), current.criticScore(), null);
            case STAGE_DONE -> {
                if (isWaitingForConfirmation(event)) {
                    yield updateTask(current, "wait_confirm", event.stage(), current.criticScore(), null);
                }
                if ("critic".equals(event.stage())) {
                    yield updateTask(current, "critic", "critic", 88, null);
                }
                yield current;
            }
            case GENERATION_COMPLETE -> updateTask(current, "done", null, 88, LocalDateTime.now());
            default -> current;
        };
    }

    private MockScenario resolveScenario(String taskId) {
        String input = defaultText(taskInputs.get(taskId), "");
        if (input.contains("红包") || input.contains("提现") || input.contains("tag")) {
            return redPacketScenario();
        }
        return loginScenario();
    }

    private MockScenario loginScenario() {
        return new MockScenario(
                "正在解析登录需求目标、用户动作和系统约束...",
                Map.of(
                        "businessGoals", List.of("提升登录链路质量", "覆盖正常、异常和边界路径"),
                        "userActions", List.of("输入账号密码", "提交登录"),
                        "systemBehaviors", List.of("校验账号密码", "返回登录结果"),
                        "constraints", List.of("密码长度 6-20 位", "错误信息需要明确")
                ),
                "正在拆分可测试对象：登录表单、账号校验、错误提示、跳转流程...",
                List.of(
                        Map.of("name", "登录表单", "type", "ui", "dimensions", List.of("输入校验", "提交交互"), "priority", "P0"),
                        Map.of("name", "账号密码校验", "type", "function", "dimensions", List.of("正常路径", "异常路径"), "priority", "P0"),
                        Map.of("name", "登录后跳转", "type", "flow", "dimensions", List.of("成功跳转", "失败停留"), "priority", "P1")
                ),
                "正在生成登录链路测试用例，并补齐前置条件、步骤和预期结果...",
                loginGeneratedCases()
        );
    }

    private MockScenario redPacketScenario() {
        return new MockScenario(
                "正在解析策略红包展示、领取入口、库存提示和提现后状态更新规则...",
                Map.of(
                        "businessGoals", List.of("保障策略红包展示与领取流程正确", "覆盖库存不足、状态更新和页面跳转"),
                        "userActions", List.of("查看策略红包 tag", "点击策略红包", "进入提现详情页", "完成提现后回到活动主页"),
                        "systemBehaviors", List.of("按红包类型展示 tag", "根据库存返回领取结果", "提现完成后更新红包展示状态"),
                        "constraints", List.of("新人红包、加油红包需要区分展示", "库存不足时提示该红包已被抢光", "提现完成后活动主页状态同步")
                ),
                "正在拆分可测试对象：策略红包 tag、提现详情入口、库存校验、提现完成状态同步...",
                List.of(
                        Map.of("name", "策略红包 tag 展示", "type", "ui", "dimensions", List.of("新人红包", "加油红包", "余额展示"), "priority", "P0"),
                        Map.of("name", "策略红包点击跳转", "type", "flow", "dimensions", List.of("进入提现详情页", "选中态展示"), "priority", "P0"),
                        Map.of("name", "策略红包库存校验", "type", "function", "dimensions", List.of("仍有余额", "库存不足提示"), "priority", "P0"),
                        Map.of("name", "提现完成状态同步", "type", "data", "dimensions", List.of("活动主页刷新", "红包状态更新"), "priority", "P1")
                ),
                "正在生成策略红包测试用例，覆盖 tag 展示、点击流程、库存不足和提现完成后的状态更新...",
                redPacketGeneratedCases()
        );
    }

    private boolean isWaitingForConfirmation(GenerateSseEventDto event) {
        if (!(event.payload() instanceof Map<?, ?> payload)) {
            return false;
        }
        return Boolean.TRUE.equals(payload.get("needConfirm"));
    }

    private TestCaseDto getCase(Long caseId) {
        TestCaseDto testCase = casesById.get(caseId);
        if (testCase == null) {
            throw new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId);
        }
        return testCase;
    }

    private TestCaseDto buildCase(
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
        String expected = requireText(request.expected(), "预期结果不能为空");
        long id = caseId == null ? caseIdGenerator.getAndIncrement() : caseId;
        return new TestCaseDto(
                id,
                projectId,
                request.parentId(),
                title,
                defaultText(request.precondition(), ""),
                steps,
                expected,
                normalizePriority(request.priority()),
                request.tags() == null ? List.of() : List.copyOf(request.tags()),
                defaultText(request.source(), "manual"),
                normalizeExecutionStatus(request.executionStatus()),
                request.layout() == null ? Map.of("collapsed", false) : Map.copyOf(request.layout()),
                version,
                createdAt,
                updatedAt
        );
    }

    private GenerateTaskDto updateTask(
            GenerateTaskDto current,
            String status,
            String currentStage,
            Integer criticScore,
            LocalDateTime completedAt
    ) {
        GenerateTaskDto updated = new GenerateTaskDto(
                current.taskId(),
                current.projectId(),
                current.mode(),
                status,
                currentStage,
                current.streamUrl(),
                criticScore,
                current.createdAt(),
                LocalDateTime.now(),
                completedAt
        );
        tasks.put(updated.taskId(), updated);
        return updated;
    }

    private GenerateSseEventDto event(String taskId, GenerateSseEventName event, String stage, long sequence, Object payload) {
        return new GenerateSseEventDto(event, taskId, stage, sequence, LocalDateTime.now(), payload);
    }

    private List<GeneratedCaseDto> loginGeneratedCases() {
        return List.of(
                new GeneratedCaseDto(
                        "正确账号密码登录成功",
                        "用户已注册合法账号，系统处于正常运行状态",
                        List.of("打开登录页面", "输入正确的用户名和密码", "点击登录按钮"),
                        "登录成功并跳转首页",
                        "P0",
                        List.of("Web", "AI"),
                        "ai",
                        "happy"
                ),
                new GeneratedCaseDto(
                        "错误密码登录失败",
                        "用户已注册合法账号，系统处于正常运行状态",
                        List.of("打开登录页面", "输入正确用户名和错误密码", "点击登录按钮"),
                        "页面提示用户名或密码错误",
                        "P1",
                        List.of("Web", "AI"),
                        "ai",
                        "error"
                ),
                new GeneratedCaseDto(
                        "空账号提交登录失败",
                        "系统处于正常运行状态",
                        List.of("打开登录页面", "用户名留空并输入密码", "点击登录按钮"),
                        "页面提示请输入账号",
                        "P1",
                        List.of("Web", "AI"),
                        "ai",
                        "boundary"
                )
        );
    }

    private List<GeneratedCaseDto> redPacketGeneratedCases() {
        return List.of(
                new GeneratedCaseDto(
                        "策略红包仍有余额时展示对应 tag",
                        "用户进入活动主页，策略红包配置已开启且红包仍有余额",
                        List.of("打开活动主页", "查看策略红包区域", "分别检查新人红包和加油红包 tag"),
                        "页面展示策略红包入口，并正确区分新人红包、加油红包 tag",
                        "P0",
                        List.of("Web", "AI", "策略红包"),
                        "ai",
                        "happy"
                ),
                new GeneratedCaseDto(
                        "点击策略红包进入提现详情页",
                        "策略红包在活动主页正常展示，用户具备提现资格",
                        List.of("打开活动主页", "点击新人红包或加油红包 tag", "观察页面跳转和选中状态"),
                        "系统进入提现详情页，当前策略红包被选中并展示对应提现信息",
                        "P0",
                        List.of("Web", "AI", "提现"),
                        "ai",
                        "happy"
                ),
                new GeneratedCaseDto(
                        "策略红包库存不足时提示已被抢光",
                        "策略红包入口仍可见，但后端返回红包库存不足",
                        List.of("打开活动主页", "点击策略红包进入提现详情页", "点击提现或领取按钮"),
                        "流程提示该红包已被抢光，用户无法继续领取该策略红包",
                        "P0",
                        List.of("Web", "AI", "库存校验"),
                        "ai",
                        "error"
                ),
                new GeneratedCaseDto(
                        "提现完成后活动主页状态更新",
                        "用户已成功进入提现详情页并完成策略红包提现",
                        List.of("完成提现流程", "返回活动主页", "刷新或重新进入活动主页"),
                        "活动主页同步最新状态，不再展示已完成提现的策略红包或展示已领取状态",
                        "P1",
                        List.of("Web", "AI", "状态同步"),
                        "ai",
                        "alternative"
                )
        );
    }

    private record MockScenario(
            String e1Chunk,
            Object e1Result,
            String e2Chunk,
            Object e2Result,
            String e3Chunk,
            List<GeneratedCaseDto> cases
    ) {
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String defaultText(String value, String fallback) {
        return value == null ? fallback : value;
    }

    private String normalizePriority(String priority) {
        String safePriority = defaultText(priority, "P1").trim().toUpperCase();
        if (!PRIORITIES.contains(safePriority)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "优先级只支持 P0/P1/P2/P3");
        }
        return safePriority;
    }

    private String normalizeExecutionStatus(String executionStatus) {
        String safeStatus = defaultText(executionStatus, "not_run").trim();
        if (!EXECUTION_STATUSES.contains(safeStatus)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "执行状态不合法: " + safeStatus);
        }
        return safeStatus;
    }

    private String normalizeMode(String mode) {
        String safeMode = defaultText(mode, "auto").trim();
        if (!"auto".equals(safeMode) && !"step".equals(safeMode)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "生成模式只支持 auto 或 step");
        }
        return safeMode;
    }
}
