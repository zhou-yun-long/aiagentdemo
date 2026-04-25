package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.time.LocalDateTime;

public record GenerateSseEventDto(
        GenerateSseEventName event,
        String taskId,
        String stage,
        long sequence,
        LocalDateTime timestamp,
        Object payload
) {
}
