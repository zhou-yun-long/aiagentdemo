package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public record GenerationConfig(
        String taskKind,                  // "cases" | "points" | "api_cases", defaults to "cases"
        List<String> businessScenarios,   // ["general","doc","video","all"]
        List<String> dimensions,          // dimension keys from dictionary
        String granularity,               // "S" | "M" | "L", defaults to "M"
        List<String> targetPlatforms,     // ["any","windows","macos","android","ios","web"]
        String outputFormat,              // "excel" | "table" | "json"
        String customPrompt,              // nullable
        List<String> referenceCases       // attachmentId[]
) {
}
