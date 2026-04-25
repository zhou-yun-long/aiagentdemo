package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record TestCaseDto(
        Long id,
        Long projectId,
        Long parentId,
        String title,
        String precondition,
        List<String> steps,
        String expected,
        String priority,
        List<String> tags,
        String source,
        String executionStatus,
        Map<String, Object> layout,
        int version,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
