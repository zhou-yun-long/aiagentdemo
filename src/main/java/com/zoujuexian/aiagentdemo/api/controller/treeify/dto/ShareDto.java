package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record ShareDto(
        Long id,
        Long projectId,
        String shareToken,
        String shareUrl,
        boolean active,
        LocalDateTime createdAt
) {
}
