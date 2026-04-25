package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

public record CaseStatsDto(
        long total,
        long measured,
        long passed,
        double passRate
) {
}
