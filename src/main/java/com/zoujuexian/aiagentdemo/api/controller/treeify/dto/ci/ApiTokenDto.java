package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci;

import java.time.LocalDateTime;

public record ApiTokenDto(
        Long id,
        Long projectId,
        String name,
        String token,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt
) {
}
