package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.DefectStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review.ReviewStatsDto;

import java.time.LocalDateTime;
import java.util.List;

public record DashboardDto(
        long totalCases,
        long coveredCases,
        long passedCases,
        long failedCases,
        long blockedCases,
        double passRate,
        int activeTokens,
        List<RecentActivity> recentActivity,
        DefectStatsDto defectStats,
        ReviewStatsDto reviewStats
) {
    public record RecentActivity(
            String type,
            String description,
            LocalDateTime timestamp
    ) {
    }
}
