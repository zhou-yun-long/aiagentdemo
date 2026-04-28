package com.zoujuexian.aiagentdemo.service.treeify.agent;

import java.util.Map;

/**
 * Context passed between generation stages.
 * Carries forward results from previous stages, user feedback,
 * and project-level context (summary + RAG).
 */
public record StageContext(
        String taskId,
        String input,
        String feedback,
        Map<String, Object> stageResults,
        String projectSummary,
        String ragContext
) {

    public StageContext(String taskId, String input) {
        this(taskId, input, null, Map.of(), null, null);
    }

    public StageContext(String taskId, String input, String projectSummary, String ragContext) {
        this(taskId, input, null, Map.of(), projectSummary, ragContext);
    }

    public StageContext withFeedback(String feedback) {
        return new StageContext(taskId, input, feedback, stageResults, projectSummary, ragContext);
    }

    public StageContext withResult(String stage, Object result) {
        Map<String, Object> updated = new java.util.LinkedHashMap<>(stageResults);
        updated.put(stage, result);
        return new StageContext(taskId, input, feedback, updated, projectSummary, ragContext);
    }

    public Object getResult(String stage) {
        return stageResults.get(stage);
    }

    public String getResultJson(String stage) {
        Object result = stageResults.get(stage);
        if (result == null) return null;
        return result instanceof String s ? s : com.alibaba.fastjson.JSON.toJSONString(result);
    }
}
