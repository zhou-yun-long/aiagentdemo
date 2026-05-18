package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.CreateTestPlanRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.PlanCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.PlanDetailDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.TestPlanDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyPlanCase;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestPlan;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyPlanCaseRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PlanService {

    private static final Set<String> VALID_EXECUTION_RESULTS = Set.of(
            "pass", "fail", "blocked", "skipped"
    );

    private static final Map<String, Set<String>> STATE_TRANSITIONS = Map.of(
            "draft", Set.of("active", "archived"),
            "active", Set.of("done", "archived"),
            "done", Set.of("archived"),
            "archived", Set.of()
    );

    private final TreeifyTestPlanRepository planRepo;
    private final TreeifyPlanCaseRepository planCaseRepo;
    private final TreeifyTestCaseRepository caseRepo;

    public PlanService(
            TreeifyTestPlanRepository planRepo,
            TreeifyPlanCaseRepository planCaseRepo,
            TreeifyTestCaseRepository caseRepo
    ) {
        this.planRepo = planRepo;
        this.planCaseRepo = planCaseRepo;
        this.caseRepo = caseRepo;
    }

    // ──── Plan CRUD ────

    public TestPlanDto createPlan(Long projectId, CreateTestPlanRequest request) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "计划名称不能为空");
        }
        LocalDateTime now = LocalDateTime.now();
        TreeifyTestPlan entity = new TreeifyTestPlan();
        entity.setProjectId(projectId);
        entity.setName(request.name().trim());
        entity.setDescription(request.description() != null ? request.description() : "");
        entity.setStatus("draft");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        TreeifyTestPlan saved = planRepo.save(entity);

        if (request.caseIds() != null && !request.caseIds().isEmpty()) {
            addCasesInternal(saved.getId(), request.caseIds());
        }

        return toDto(saved);
    }

    public List<TestPlanDto> listPlans(Long projectId) {
        return planRepo.findAllByProjectIdOrderByIdDesc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    public PlanDetailDto getPlanDetail(Long planId) {
        TreeifyTestPlan plan = findPlan(planId);
        List<PlanCaseDto> cases = planCaseRepo.findByPlanIdOrderById(planId).stream()
                .map(this::toCaseDto)
                .toList();
        return new PlanDetailDto(toDto(plan), cases);
    }

    public TestPlanDto updatePlan(Long planId, CreateTestPlanRequest request) {
        TreeifyTestPlan entity = findPlan(planId);
        if (request.name() != null && !request.name().isBlank()) {
            entity.setName(request.name().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(planRepo.save(entity));
    }

    @Transactional
    public void deletePlan(Long planId) {
        findPlan(planId);
        List<TreeifyPlanCase> cases = planCaseRepo.findByPlanIdOrderById(planId);
        if (!cases.isEmpty()) {
            planCaseRepo.deleteAll(cases);
        }
        planRepo.deleteById(planId);
    }

    // ──── State machine ────

    public TestPlanDto transitionPlan(Long planId, String targetStatus) {
        TreeifyTestPlan entity = findPlan(planId);
        String current = entity.getStatus();
        Set<String> allowed = STATE_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new BusinessException(ApiErrorCode.PLAN_INVALID_STATE,
                    "计划状态不允许从 " + current + " 变更为 " + targetStatus);
        }
        entity.setStatus(targetStatus);
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(planRepo.save(entity));
    }

    // ──── Case binding ────

    @Transactional
    public List<PlanCaseDto> addCases(Long planId, List<Long> caseIds) {
        findPlan(planId);
        return addCasesInternal(planId, caseIds);
    }

    private List<PlanCaseDto> addCasesInternal(Long planId, List<Long> caseIds) {
        if (caseIds == null || caseIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now();
        List<PlanCaseDto> result = new ArrayList<>();
        Set<Long> uniqueIds = new HashSet<>(caseIds);
        for (Long caseId : uniqueIds) {
            if (caseId == null) continue;
            TreeifyTestCase testCase = caseRepo.findById(caseId)
                    .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId));
            if (planCaseRepo.findByPlanIdAndCaseId(planId, caseId).isPresent()) {
                continue; // skip duplicates
            }
            TreeifyPlanCase pc = new TreeifyPlanCase();
            pc.setPlanId(planId);
            pc.setCaseId(caseId);
            pc.setCreatedAt(now);
            pc.setUpdatedAt(now);
            TreeifyPlanCase saved = planCaseRepo.save(pc);
            result.add(toCaseDto(saved, testCase.getTitle()));
        }
        return result;
    }

    // ──── Case result update ────

    public PlanCaseDto updateCaseResult(Long planId, Long caseId, String executionResult, String note) {
        findPlan(planId);
        TreeifyPlanCase pc = planCaseRepo.findByPlanIdAndCaseId(planId, caseId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND,
                        "计划中不存在该用例: planId=" + planId + ", caseId=" + caseId));
        if (executionResult != null) {
            String normalized = executionResult.trim().toLowerCase();
            if (!VALID_EXECUTION_RESULTS.contains(normalized)) {
                throw new BusinessException(ApiErrorCode.BAD_REQUEST,
                        "执行结果只支持 pass/fail/blocked/skipped");
            }
            pc.setExecutionResult(normalized);
        }
        if (note != null) {
            pc.setNote(note);
        }
        pc.setUpdatedAt(LocalDateTime.now());
        return toCaseDto(planCaseRepo.save(pc));
    }

    // ──── Recompute plan status ────

    public TestPlanDto recomputeStatus(Long planId) {
        TreeifyTestPlan plan = findPlan(planId);
        long totalCases = planCaseRepo.countByPlanId(planId);
        if (totalCases == 0) {
            return toDto(plan);
        }
        long passedCount = planCaseRepo.countByPlanIdAndExecutionResult(planId, "pass");
        long failedCount = planCaseRepo.countByPlanIdAndExecutionResult(planId, "fail");
        long blockedCount = planCaseRepo.countByPlanIdAndExecutionResult(planId, "blocked");
        long skippedCount = planCaseRepo.countByPlanIdAndExecutionResult(planId, "skipped");

        long executedCount = passedCount + failedCount + blockedCount + skippedCount;

        if (executedCount >= totalCases) {
            plan.setStatus("done");
        } else if (executedCount > 0) {
            plan.setStatus("active");
        }
        plan.setUpdatedAt(LocalDateTime.now());
        return toDto(planRepo.save(plan));
    }

    // ──── Entity helpers ────

    private TreeifyTestPlan findPlan(Long planId) {
        return planRepo.findById(planId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "测试计划不存在: " + planId));
    }

    // ──── Entity -> DTO converters ────

    private TestPlanDto toDto(TreeifyTestPlan entity) {
        long caseCount = planCaseRepo.countByPlanId(entity.getId());
        long passedCount = planCaseRepo.countByPlanIdAndExecutionResult(entity.getId(), "pass");
        return new TestPlanDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                caseCount,
                passedCount
        );
    }

    private PlanCaseDto toCaseDto(TreeifyPlanCase entity) {
        String caseTitle = caseRepo.findById(entity.getCaseId())
                .map(TreeifyTestCase::getTitle)
                .orElse(null);
        return toCaseDto(entity, caseTitle);
    }

    private PlanCaseDto toCaseDto(TreeifyPlanCase entity, String caseTitle) {
        return new PlanCaseDto(
                entity.getId(),
                entity.getPlanId(),
                entity.getCaseId(),
                caseTitle,
                entity.getAssigneeId(),
                entity.getExecutionResult(),
                entity.getNote(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
