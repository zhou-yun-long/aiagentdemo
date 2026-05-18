package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review;

public record ReviewStatsDto(
        long pending,
        long approved,
        long rejected,
        long needsRevision
) {
}
