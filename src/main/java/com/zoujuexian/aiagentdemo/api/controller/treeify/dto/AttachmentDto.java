package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record AttachmentDto(
    String attachmentId,
    String fileName,
    String contentType,
    long size,
    String purpose,
    LocalDateTime createdAt
) {}
