package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record ProjectSummaryDto(
        Long id,
        Long projectId,
        String content,
        int version,
        boolean current,
        LocalDateTime createdAt
) {
}
