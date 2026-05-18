package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect;

public record TransitionDefectRequest(
        String targetStatus,
        String resolution
) {
}
