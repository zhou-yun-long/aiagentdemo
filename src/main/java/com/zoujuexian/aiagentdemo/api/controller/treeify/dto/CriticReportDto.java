package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record CriticReportDto(
        int score,
        List<String> issues,
        int retryCount
) {
}
