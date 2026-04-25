package com.zoujuexian.aiagentdemo.api.common;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Stable page response shape for frontend React Query caches.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        @JsonProperty("page_size") int pageSize,
        long total
) {
}
