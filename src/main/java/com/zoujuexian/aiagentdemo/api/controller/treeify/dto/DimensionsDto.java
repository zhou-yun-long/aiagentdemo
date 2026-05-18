package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record DimensionsDto(
        List<Category> categories
) {
    public record Category(
            String key,
            String label,
            List<Dimension> dimensions
    ) {}

    public record Dimension(
            String key,
            String label,
            String priority
    ) {}
}
