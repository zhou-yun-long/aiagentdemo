package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect;

public record UpdateDefectRequest(
        String title,
        String description,
        String severity,
        String assignee
) {
}
