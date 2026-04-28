package com.zoujuexian.aiagentdemo.service.treeify.agent;

/**
 * Result produced by a StageAgent.
 *
 * @param content human-readable summary for SSE chunk
 * @param data    structured result (JSONObject, List, GeneratedCaseDto list, etc.)
 */
public record StageResult(String content, Object data) {
}
