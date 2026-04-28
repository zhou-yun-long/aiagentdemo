package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record SnapshotDto(
        Long id,
        Long projectId,
        String name,
        String description,
        int caseCount,
        String format,
        String data,
        LocalDateTime createdAt
) {
}
