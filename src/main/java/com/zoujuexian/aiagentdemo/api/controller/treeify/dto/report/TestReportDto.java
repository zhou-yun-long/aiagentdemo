package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report;

import java.time.LocalDateTime;

public record TestReportDto(
        Long id,
        Long projectId,
        Long planId,
        String name,
        LocalDateTime createdAt,
        Long createdBy
) {
}
