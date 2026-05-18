package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report;

import java.util.Map;

public record ReportSummaryDto(
        int totalCases,
        int passedCases,
        int failedCases,
        int blockedCases,
        int skippedCases,
        double passRate,
        Map<String, Integer> priorityDistribution
) {
}
