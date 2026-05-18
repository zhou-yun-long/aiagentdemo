package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect;

import java.time.LocalDateTime;

public record DefectDto(
        Long id,
        Long projectId,
        String title,
        String description,
        String severity,
        String status,
        Long caseId,
        Long planId,
        String reporter,
        String assignee,
        String resolution,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
