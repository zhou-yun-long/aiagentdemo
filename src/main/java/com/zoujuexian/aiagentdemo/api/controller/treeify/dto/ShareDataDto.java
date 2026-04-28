package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record ShareDataDto(
        ProjectDto project,
        List<TestCaseDto> cases,
        List<MindmapNodeDto> mindmap,
        CaseStatsDto stats
) {
}
