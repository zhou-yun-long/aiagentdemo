package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.CreateTestPlanRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.PlanCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.PlanDetailDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.TestPlanDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.UpdatePlanCaseResultRequest;
import com.zoujuexian.aiagentdemo.service.treeify.PlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @PostMapping("/plans")
    public ResponseEntity<ApiResponse<TestPlanDto>> createPlan(
            @RequestBody CreateTestPlanRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(planService.createPlan(request.projectId(), request)));
    }

    @GetMapping("/projects/{projectId}/plans")
    public ApiResponse<List<TestPlanDto>> listPlans(@PathVariable Long projectId) {
        return ApiResponse.ok(planService.listPlans(projectId));
    }

    @GetMapping("/plans/{planId}")
    public ApiResponse<PlanDetailDto> getPlan(@PathVariable Long planId) {
        return ApiResponse.ok(planService.getPlanDetail(planId));
    }

    @PutMapping("/plans/{planId}")
    public ApiResponse<TestPlanDto> updatePlan(
            @PathVariable Long planId,
            @RequestBody CreateTestPlanRequest request
    ) {
        return ApiResponse.ok(planService.updatePlan(planId, request));
    }

    @DeleteMapping("/plans/{planId}")
    public ApiResponse<Void> deletePlan(@PathVariable Long planId) {
        planService.deletePlan(planId);
        return ApiResponse.ok(null);
    }

    @PutMapping("/plans/{planId}/cases/{caseId}/result")
    public ApiResponse<PlanCaseDto> updateCaseResult(
            @PathVariable Long planId,
            @PathVariable Long caseId,
            @RequestBody UpdatePlanCaseResultRequest request
    ) {
        return ApiResponse.ok(planService.updateCaseResult(
                planId, caseId, request.executionResult(), request.note()));
    }

    @PostMapping("/plans/{planId}/recompute")
    public ApiResponse<TestPlanDto> recomputeStatus(@PathVariable Long planId) {
        return ApiResponse.ok(planService.recomputeStatus(planId));
    }
}
