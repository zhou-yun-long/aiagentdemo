package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

public record CreateKnowledgeRequest(
        String title,
        String content,
        String source
) {
}
