package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;
import java.util.Map;

public record MindmapNodeDto(
        String id,
        String parentId,
        String caseId,
        String projectId,
        String title,
        String kind,
        String priority,
        List<String> tags,
        String status,
        String executionStatus,
        String source,
        Integer version,
        String lane,
        Integer depth,
        Integer order,
        String fontFamily,
        Integer fontSize,
        Integer fontWeight,
        Map<String, Object> layout
) {}
