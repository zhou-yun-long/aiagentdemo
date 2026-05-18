package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci;

public record CiCaseResult(
        Long caseId,
        String caseTitle,
        String status,
        Long duration,
        String log
) {
}
