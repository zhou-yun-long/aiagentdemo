package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan;

import java.time.LocalDateTime;

public record TestPlanDto(
        Long id,
        Long projectId,
        String name,
        String description,
        String status,
        LocalDateTime startDate,
        LocalDateTime endDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        long caseCount,
        long passedCount
) {
}
