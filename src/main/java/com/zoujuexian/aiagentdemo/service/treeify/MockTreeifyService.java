package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.BatchConfirmCasesRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CaseStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ConfirmGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateTaskDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.MindmapNodeDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.SaveMindmapRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import com.alibaba.fastjson.JSON;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Facade service for Treeify CRUD and generation task management.
 * All data is persisted to H2 via TreeifyPersistenceService.
 * Also handles SSE event application for generation tasks.
 */
@Service
public class MockTreeifyService {

    private final TreeifyPersistenceService persistence;

    public MockTreeifyService(TreeifyPersistenceService persistence) {
        this.persistence = persistence;
    }

    // ──── Project CRUD ────

    public List<ProjectDto> listProjects() {
        return persistence.listProjects();
    }

    public ProjectDto createProject(ProjectRequest request) {
        return persistence.createProject(request);
    }

    public ProjectDto getProject(Long projectId) {
        return persistence.getProject(projectId);
    }

    public ProjectDto updateProject(Long projectId, ProjectRequest request) {
        return persistence.updateProject(projectId, request);
    }

    public ProjectDto archiveProject(Long projectId) {
        return persistence.archiveProject(projectId);
    }

    // ──── TestCase CRUD ────

    public List<TestCaseDto> listCases(Long projectId) {
        return persistence.listCases(projectId);
    }

    public TestCaseDto createCase(Long projectId, TestCaseRequest request) {
        return persistence.createCase(projectId, request);
    }

    public TestCaseDto updateCase(Long caseId, TestCaseRequest request) {
        return persistence.updateCase(caseId, request);
    }

    public void deleteCase(Long caseId) {
        persistence.deleteCase(caseId);
    }

    public TestCaseDto updateExecutionStatus(Long caseId, String executionStatus) {
        return persistence.updateExecutionStatus(caseId, executionStatus);
    }

    public List<TestCaseDto> batchConfirm(BatchConfirmCasesRequest request) {
        return persistence.batchConfirm(request);
    }

    public CaseStatsDto getCaseStats(Long projectId) {
        return persistence.getCaseStats(projectId);
    }

    public List<MindmapNodeDto> getMindmap(Long projectId) {
        return persistence.getMindmap(projectId);
    }

    public List<MindmapNodeDto> saveMindmap(Long projectId, SaveMindmapRequest request) {
        return persistence.saveMindmap(projectId, request);
    }

    // ──── GenerateTask CRUD ────

    public GenerateTaskDto createGenerateTask(Long projectId, CreateGenerateTaskRequest request) {
        return persistence.createGenerateTask(projectId, request);
    }

    public GenerateTaskDto getTask(String taskId) {
        return persistence.getTask(taskId);
    }

    public String getTaskInput(String taskId) {
        return persistence.getTaskInput(taskId);
    }

    public GenerateTaskDto confirmTask(String taskId, ConfirmGenerateTaskRequest request) {
        GenerateTaskDto current = getTask(taskId);
        if (request != null && request.feedback() != null && !request.feedback().isBlank()) {
            persistence.saveFeedback(taskId, request.feedback());
            current = getTask(taskId);
        }
        String nextStatus = "e1".equals(request == null ? null : request.stage()) ? "e2" : "e3";
        return updateTask(current, nextStatus, nextStatus, current.criticScore(), null);
    }

    public GenerateTaskDto cancelTask(String taskId) {
        GenerateTaskDto current = getTask(taskId);
        return updateTask(current, "canceled", current.currentStage(), current.criticScore(), LocalDateTime.now());
    }

    // ──── SSE event application ────

    public GenerateTaskDto applyEvent(GenerateSseEventDto event) {
        GenerateTaskDto current = getTask(event.taskId());
        return switch (event.event()) {
            case STAGE_STARTED -> updateTask(current, event.stage(), event.stage(), current.criticScore(), null);
            case STAGE_DONE -> {
                String resultJson = extractResultPayload(event);
                if (resultJson != null && event.stage() != null) {
                    persistence.saveStageResult(event.taskId(), event.stage(), resultJson);
                }
                if (isWaitingForConfirmation(event)) {
                    yield updateTask(current, "wait_confirm", event.stage(), current.criticScore(), null);
                }
                if ("critic".equals(event.stage())) {
                    int score = extractCriticScore(event, current.criticScore());
                    yield updateTask(current, "critic", "critic", score, null);
                }
                yield current;
            }
            case GENERATION_COMPLETE -> {
                int score = extractCriticScore(event, current.criticScore());
                yield updateTask(current, "done", null, score, LocalDateTime.now());
            }
            default -> current;
        };
    }

    // ──── Internal helpers ────

    private int extractCriticScore(GenerateSseEventDto event, Integer fallback) {
        if (event.payload() instanceof Map<?, ?> payload) {
            Object scoreObj = payload.get("criticScore");
            if (scoreObj instanceof Number num) {
                return num.intValue();
            }
        }
        return fallback != null ? fallback : 0;
    }

    private String extractResultPayload(GenerateSseEventDto event) {
        if (event.payload() instanceof Map<?, ?> payload) {
            Object result = payload.get("result");
            if (result != null) {
                return JSON.toJSONString(result);
            }
        }
        return null;
    }

    private boolean isWaitingForConfirmation(GenerateSseEventDto event) {
        if (!(event.payload() instanceof Map<?, ?> payload)) {
            return false;
        }
        return Boolean.TRUE.equals(payload.get("needConfirm"));
    }

    private GenerateTaskDto updateTask(
            GenerateTaskDto current,
            String status,
            String currentStage,
            Integer criticScore,
            LocalDateTime completedAt
    ) {
        persistence.updateTaskStatus(current.taskId(), status, currentStage, criticScore, completedAt);
        return persistence.getTask(current.taskId());
    }
}
