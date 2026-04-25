package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record GeneratedCaseDto(
        String title,
        String precondition,
        List<String> steps,
        String expected,
        String priority,
        List<String> tags,
        String source,
        String pathType
) {
}
