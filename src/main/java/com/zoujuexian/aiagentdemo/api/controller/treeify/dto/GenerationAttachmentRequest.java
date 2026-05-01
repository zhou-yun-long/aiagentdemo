package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

public record GenerationAttachmentRequest(
        String kind,
        String fileName,
        String contentType,
        Long size,
        String content
) {
}
