package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DashboardDto(
        long totalCases,
        long coveredCases,
        long passedCases,
        long failedCases,
        long blockedCases,
        double passRate,
        List<RecentActivity> recentActivity
) {
    public record RecentActivity(
            String type,
            String description,
            LocalDateTime timestamp
    ) {
    }
}
