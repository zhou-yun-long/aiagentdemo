package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect;

public record DefectStatsDto(
        long total,
        long open,
        long inProgress,
        long resolved,
        long closed,
        long reopened
) {
}
