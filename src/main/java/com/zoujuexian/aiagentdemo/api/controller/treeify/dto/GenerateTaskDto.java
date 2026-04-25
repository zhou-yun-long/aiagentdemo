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
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime completedAt
) {
}
