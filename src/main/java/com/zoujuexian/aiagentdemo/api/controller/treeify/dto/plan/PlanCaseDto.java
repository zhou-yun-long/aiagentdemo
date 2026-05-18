package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan;

import java.time.LocalDateTime;

public record PlanCaseDto(
        Long id,
        Long planId,
        Long caseId,
        String caseTitle,
        Long assigneeId,
        String executionResult,
        String note,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
