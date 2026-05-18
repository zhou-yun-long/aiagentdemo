package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review;

import java.time.LocalDateTime;

public record ReviewDto(
        Long id,
        Long caseId,
        String caseTitle,
        String reviewer,
        String status,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
