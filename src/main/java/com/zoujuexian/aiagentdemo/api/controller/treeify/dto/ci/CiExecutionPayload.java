package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci;

import java.util.List;

public record CiExecutionPayload(
        List<CiCaseResult> results
) {
}
