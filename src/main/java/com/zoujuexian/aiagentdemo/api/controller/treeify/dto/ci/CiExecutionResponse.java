package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci;

public record CiExecutionResponse(
        int updated,
        int failed,
        int total
) {
}
