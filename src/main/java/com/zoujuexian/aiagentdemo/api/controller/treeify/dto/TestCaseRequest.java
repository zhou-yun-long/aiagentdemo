package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;
import java.util.Map;

public record TestCaseRequest(
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
        Integer version
) {
}
