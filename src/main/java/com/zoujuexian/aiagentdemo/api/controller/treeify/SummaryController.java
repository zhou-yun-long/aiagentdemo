package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectSummaryDto;
import com.zoujuexian.aiagentdemo.service.treeify.SummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping("/projects/{projectId}/summary")
    public ApiResponse<ProjectSummaryDto> getCurrentSummary(@PathVariable Long projectId) {
        ProjectSummaryDto summary = summaryService.getCurrent(projectId);
        return ApiResponse.ok(summary);
    }

    @GetMapping("/projects/{projectId}/summary/history")
    public ApiResponse<List<ProjectSummaryDto>> getSummaryHistory(@PathVariable Long projectId) {
        return ApiResponse.ok(summaryService.getHistory(projectId));
    }

    @PostMapping("/projects/{projectId}/summary/generate")
    public ApiResponse<ProjectSummaryDto> generateSummary(
            @PathVariable Long projectId,
            @RequestParam(required = false) String context
    ) {
        return ApiResponse.ok(summaryService.generate(projectId, context));
    }

    @PostMapping("/projects/{projectId}/summary/rollback/{version}")
    public ApiResponse<ProjectSummaryDto> rollbackSummary(
            @PathVariable Long projectId,
            @PathVariable int version
    ) {
        return ApiResponse.ok(summaryService.rollback(projectId, version));
    }
}
