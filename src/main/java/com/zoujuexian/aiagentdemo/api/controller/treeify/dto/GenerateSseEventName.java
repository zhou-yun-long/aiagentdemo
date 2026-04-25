package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

/**
 * Official SSE event contract for speccase generation streams.
 */
public enum GenerateSseEventName {

    STAGE_STARTED("stage_started"),
    STAGE_CHUNK("stage_chunk"),
    STAGE_DONE("stage_done"),
    GENERATION_COMPLETE("generation_complete");

    private final String value;

    GenerateSseEventName(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static GenerateSseEventName fromValue(String value) {
        return Arrays.stream(values())
                .filter(eventName -> eventName.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported generate SSE event: " + value));
    }
}
