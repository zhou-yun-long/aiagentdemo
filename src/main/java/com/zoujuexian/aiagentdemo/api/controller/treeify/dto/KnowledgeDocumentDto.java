package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record KnowledgeDocumentDto(
        Long id,
        Long projectId,
        String title,
        String content,
        String source,
        LocalDateTime createdAt
) {
}
