package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect;

public record CreateDefectRequest(
        String title,
        String description,
        String severity,
        Long caseId,
        Long planId,
        String reporter,
        String assignee
) {
}
