package com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review;

public record SubmitReviewRequest(
        String reviewer,
        String status,
        String comment
) {
}
