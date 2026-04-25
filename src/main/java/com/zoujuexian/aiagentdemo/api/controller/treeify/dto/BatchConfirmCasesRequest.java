package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record BatchConfirmCasesRequest(
        Long projectId,
        List<GeneratedCaseDto> cases
) {
}
