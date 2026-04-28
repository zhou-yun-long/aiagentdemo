package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record GenerateTaskDto(
        String taskId,
        Long projectId,
        String mode,
        String status,
        String currentStage,
        String streamUrl,
        Integer criticScore,
        String selectedNodeId,
        java.util.List<Long> contextCaseIds,
        String e1Result,
        String e2Result,
        String feedback,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime completedAt
) {
}
