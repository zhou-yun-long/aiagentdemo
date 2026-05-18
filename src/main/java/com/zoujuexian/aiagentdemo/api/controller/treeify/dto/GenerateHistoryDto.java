package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record GenerateHistoryDto(
        String taskId,
        Long projectId,
        String mode,
        String status,
        String currentStage,
        String taskKind,
        Integer criticScore,
        Integer resultCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime completedAt
) {
}
