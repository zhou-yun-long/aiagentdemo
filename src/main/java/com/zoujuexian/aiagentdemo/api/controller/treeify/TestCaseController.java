package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.BatchConfirmCasesRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CaseStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.MindmapNodeDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.SaveMindmapRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.UpdateExecutionStatusRequest;
import com.zoujuexian.aiagentdemo.service.treeify.MockTreeifyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class TestCaseController {

    private final MockTreeifyService treeifyService;

    public TestCaseController(MockTreeifyService treeifyService) {
        this.treeifyService = treeifyService;
    }

    @GetMapping("/projects/{projectId}/cases")
    public ApiResponse<List<TestCaseDto>> listCases(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.listCases(projectId));
    }

    @GetMapping("/projects/{projectId}/cases/stats")
    public ApiResponse<CaseStatsDto> getCaseStats(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.getCaseStats(projectId));
    }

    @GetMapping("/projects/{projectId}/mindmap")
    public ApiResponse<List<MindmapNodeDto>> getMindmap(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.getMindmap(projectId));
    }

    @PutMapping("/projects/{projectId}/mindmap")
    public ApiResponse<List<MindmapNodeDto>> saveMindmap(
            @PathVariable Long projectId,
            @RequestBody SaveMindmapRequest request
    ) {
        return ApiResponse.ok(treeifyService.saveMindmap(projectId, request));
    }

    @PostMapping("/projects/{projectId}/cases")
    public ResponseEntity<ApiResponse<TestCaseDto>> createCase(
            @PathVariable Long projectId,
            @RequestBody TestCaseRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(treeifyService.createCase(projectId, request)));
    }

    @PutMapping("/cases/{caseId}")
    public ApiResponse<TestCaseDto> updateCase(@PathVariable Long caseId, @RequestBody TestCaseRequest request) {
        return ApiResponse.ok(treeifyService.updateCase(caseId, request));
    }

    @DeleteMapping("/cases/{caseId}")
    public ApiResponse<Map<String, Object>> deleteCase(@PathVariable Long caseId) {
        treeifyService.deleteCase(caseId);
        return ApiResponse.ok(Map.of("deleted", true, "caseId", caseId));
    }

    @PatchMapping("/cases/{caseId}/execution-status")
    public ApiResponse<TestCaseDto> updateExecutionStatus(
            @PathVariable Long caseId,
            @RequestBody UpdateExecutionStatusRequest request
    ) {
        return ApiResponse.ok(treeifyService.updateExecutionStatus(caseId, request.executionStatus()));
    }

    @PostMapping("/cases/batch-confirm")
    public ApiResponse<List<TestCaseDto>> batchConfirm(@RequestBody BatchConfirmCasesRequest request) {
        return ApiResponse.ok(treeifyService.batchConfirm(request));
    }
}
