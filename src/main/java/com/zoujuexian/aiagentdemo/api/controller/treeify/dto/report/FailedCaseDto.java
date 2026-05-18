package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report;

public record FailedCaseDto(
        Long caseId,
        String caseTitle,
        String priority,
        String executionResult,
        String note
) {
}
