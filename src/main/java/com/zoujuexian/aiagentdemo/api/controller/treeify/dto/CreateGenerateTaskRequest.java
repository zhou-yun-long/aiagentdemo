package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record CreateGenerateTaskRequest(
        String mode,
        String input,
        Long prdDocumentId,
        List<Long> contextCaseIds,
        String selectedNodeId
) {
}
