package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan;

import java.util.List;

public record PlanDetailDto(
        TestPlanDto plan,
        List<PlanCaseDto> cases
) {
}
