package com.zoujuexian.aiagentdemo.service.treeify.agent;

import java.util.List;
import java.util.Map;

/**
 * Context passed between generation stages.
 * Carries forward results from previous stages and user feedback.
 */
public record StageContext(
        String taskId,
        String input,
        String feedback,
        Map<String, Object> stageResults
) {

    public StageContext(String taskId, String input) {
        this(taskId, input, null, Map.of());
    }

    public StageContext withFeedback(String feedback) {
        return new StageContext(taskId, input, feedback, stageResults);
    }

    public StageContext withResult(String stage, Object result) {
        Map<String, Object> updated = new java.util.LinkedHashMap<>(stageResults);
        updated.put(stage, result);
        return new StageContext(taskId, input, feedback, updated);
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
