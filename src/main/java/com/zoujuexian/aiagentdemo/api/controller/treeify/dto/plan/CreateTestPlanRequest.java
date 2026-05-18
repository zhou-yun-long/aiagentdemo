package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan;

import java.util.List;

public record CreateTestPlanRequest(
        Long projectId,
        String name,
        String description,
        List<Long> caseIds
) {
}
