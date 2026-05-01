package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_CHUNK;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI-driven generation service that uses Spring AI ChatClient for real LLM calls.
 * Falls back to template-based generation when LLM is unavailable or API key is invalid.
 * Not annotated with @Service — bean is created by TreeifyGenerationConfig based on mode.
 */
public class AiTreeifyGenerationService implements TreeifyGenerationService {

    private static final Logger log = LoggerFactory.getLogger(AiTreeifyGenerationService.class);

    private final ChatClient chatClient;
    private final MockGenerationService fallback;
    private final boolean llmAvailable;

    public AiTreeifyGenerationService(
            ChatClient chatClient,
            MockGenerationService fallback,
            String apiKey
    ) {
        this.chatClient = chatClient;
        this.fallback = fallback;
        this.llmAvailable = apiKey != null && !apiKey.isBlank() && !"test".equals(apiKey);
        log.info("AiTreeifyGenerationService initialized, llmAvailable={}", llmAvailable);
    }

    @Override
    public List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                                  String e1Result, String e2Result, String feedback, Long projectId) {
        if (!llmAvailable) {
            log.debug("LLM not available, falling back to mock generation for task {}", taskId);
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
        try {
            return buildAiEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback);
        } catch (Exception e) {
            log.warn("AI generation failed for task {}, falling back to mock: {}", taskId, e.getMessage());
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
    }

    // ──── AI-powered generation ────

    private List<GenerateSseEventDto> buildAiEvents(String taskId, String mode, String input, String currentStage,
                                                     String e1Result, String e2Result, String feedback) {
        if (!"step".equals(mode)) {
            return buildAiAutoEvents(taskId, input);
        }
        String stage = currentStage != null ? currentStage : "e1";
        return switch (stage) {
            case "e2" -> buildAiStepE2Events(taskId, input, e1Result, feedback);
            case "e3", "critic" -> buildAiFinalEvents(taskId, input, e1Result, e2Result, feedback);
            default -> buildAiStepE1Events(taskId, input);
        };
    }

    private List<GenerateSseEventDto> buildAiAutoEvents(String taskId, String input) {
        return rebuildAutoEvents(taskId, input);
    }

    private List<GenerateSseEventDto> rebuildAutoEvents(String taskId, String input) {
        long seq = 1;
        List<GenerateSseEventDto> events = new ArrayList<>();

        // E1
        JSONObject e1Result = callLlm(e1Prompt(input));
        events.add(event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")));
        events.add(event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", "正在解析需求目标、用户动作和系统约束...")));
        events.add(event(taskId, STAGE_DONE, "e1", seq++, Map.of(
                "needConfirm", false,
                "result", e1Result
        )));

        // E2
        JSONObject e2Result = callLlm(e2Prompt(input, e1Result));
        events.add(event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")));
        events.add(event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", "正在拆分可测试对象...")));
        events.add(event(taskId, STAGE_DONE, "e2", seq++, Map.of(
                "needConfirm", false,
                "result", e2Result
        )));

        // E3 + Critic + Complete
        List<GeneratedCaseDto> cases = callLlmForCases(input, e1Result, e2Result);
        int criticScore = callLlmForCriticScore(input, cases);
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", "正在生成测试用例...")));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", cases)));
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of(
                "needConfirm", false,
                "result", new CriticReportDto(criticScore, List.of("AI 生成的用例覆盖了主要路径"), 0)
        )));
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", criticScore, "cases", cases)));

        return events;
    }

    private List<GenerateSseEventDto> buildAiStepE1Events(String taskId, String input) {
        long seq = 1;
        List<GenerateSseEventDto> events = new ArrayList<>();
        JSONObject e1Result = callLlm(e1Prompt(input));
        events.add(event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")));
        events.add(event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", "正在解析需求目标、用户动作和系统约束...")));
        events.add(event(taskId, STAGE_DONE, "e1", seq++, Map.of(
                "needConfirm", true,
                "result", e1Result
        )));
        return events;
    }

    private List<GenerateSseEventDto> buildAiStepE2Events(String taskId, String input, String e1Result, String feedback) {
        long seq = 4;
        List<GenerateSseEventDto> events = new ArrayList<>();
        JSONObject e2Result;
        if (e1Result != null && !e1Result.isBlank()) {
            try {
                JSONObject e1Json = JSON.parseObject(e1Result);
                e2Result = callLlm(buildE2PromptWithFeedback(e2Prompt(input, e1Json), feedback));
            } catch (Exception e) {
                log.warn("Failed to parse stored e1Result, falling back to input-only prompt: {}", e.getMessage());
                e2Result = callLlm(buildE2PromptWithFeedback(e2PromptFromInput(input), feedback));
            }
        } else {
            e2Result = callLlm(buildE2PromptWithFeedback(e2PromptFromInput(input), feedback));
        }
        events.add(event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")));
        events.add(event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", "正在拆分可测试对象...")));
        events.add(event(taskId, STAGE_DONE, "e2", seq++, Map.of(
                "needConfirm", true,
                "result", e2Result
        )));
        return events;
    }

    private List<GenerateSseEventDto> buildAiFinalEvents(String taskId, String input, String e1Result, String e2Result, String feedback) {
        long seq = 7;
        List<GenerateSseEventDto> events = new ArrayList<>();
        List<GeneratedCaseDto> cases;
        Object e1Json = safeParseJson(e1Result);
        Object e2Json = safeParseJson(e2Result);
        if (e1Json != null || e2Json != null) {
            String prompt = buildE3PromptWithFeedback(e3Prompt(input, e1Json, e2Json), feedback);
            cases = callLlmForCasesWithPrompt(prompt);
        } else {
            String prompt = buildE3PromptWithFeedback(e3PromptFromInput(input), feedback);
            cases = callLlmForCasesWithPrompt(prompt);
        }
        int criticScore = callLlmForCriticScore(input, cases);
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", "正在生成测试用例...")));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", cases)));
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of(
                "needConfirm", false,
                "result", new CriticReportDto(criticScore, List.of("AI 生成的用例覆盖了主要路径"), 0)
        )));
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", criticScore, "cases", cases)));
        return events;
    }

    // ──── LLM prompts ────

    private String e1Prompt(String input) {
        return """
                你是一个专业的测试分析师。请根据以下需求，提取业务目标、用户动作、系统行为和约束条件。

                需求：""" + input + """

                请以 JSON 格式返回，包含以下字段：
                - businessGoals: 业务目标列表
                - userActions: 用户动作列表
                - systemBehaviors: 系统行为列表
                - constraints: 约束条件列表

                只返回 JSON，不要添加其他文字。
                """;
    }

    private String e2Prompt(String input, JSONObject e1Result) {
        return """
                你是一个专业的测试设计师。请根据以下需求和 E1 阶段的分析结果，拆分可测试对象。

                需求：""" + input + """

                E1 分析结果：""" + e1Result.toJSONString() + """

                请以 JSON 数组格式返回可测试对象列表，每个对象包含：
                - name: 可测试对象名称
                - type: 类型(ui/function/flow/data)
                - dimensions: 测试维度列表
                - priority: 优先级(P0/P1/P2)

                只返回 JSON 数组，不要添加其他文字。
                """;
    }

    private String e2PromptFromInput(String input) {
        return """
                你是一个专业的测试设计师。请根据以下需求，拆分可测试对象。

                需求：""" + input + """

                请以 JSON 数组格式返回可测试对象列表，每个对象包含：
                - name: 可测试对象名称
                - type: 类型(ui/function/flow/data)
                - dimensions: 测试维度列表
                - priority: 优先级(P0/P1/P2)

                只返回 JSON 数组，不要添加其他文字。
                """;
    }

    private String e3Prompt(String input, Object e1Result, Object e2Result) {
        return """
                你是一个专业的测试用例编写专家。请根据以下需求和前面的分析结果，生成测试用例。

                需求：""" + input + """

                E1 分析结果：""" + stringifyJson(e1Result) + """

                E2 拆分结果：""" + stringifyJson(e2Result) + """

                请以 JSON 数组格式返回测试用例列表，必须使用以下英文字段名，且每个字段都不能为空：
                - title: 用例标题
                - precondition: 前置条件
                - steps: 执行步骤列表
                - expected: 预期结果
                - priority: 优先级(P0/P1/P2/P3)
                - tags: 标签列表
                - source: 来源("ai")
                - pathType: 路径类型(happy/error/boundary/alternative)

                expected 必须描述用户或系统最终可观察到的结果，不要省略。
                覆盖正常路径、异常路径和边界场景。只返回 JSON 数组，不要添加其他文字。
                """;
    }

    private String e3PromptFromInput(String input) {
        return """
                你是一个专业的测试用例编写专家。请根据以下需求，生成测试用例。

                需求：""" + input + """

                请以 JSON 数组格式返回测试用例列表，必须使用以下英文字段名，且每个字段都不能为空：
                - title: 用例标题
                - precondition: 前置条件
                - steps: 执行步骤列表
                - expected: 预期结果
                - priority: 优先级(P0/P1/P2/P3)
                - tags: 标签列表
                - source: 来源("ai")
                - pathType: 路径类型(happy/error/boundary/alternative)

                expected 必须描述用户或系统最终可观察到的结果，不要省略。
                覆盖正常路径、异常路径和边界场景。只返回 JSON 数组，不要添加其他文字。
                """;
    }

    private String criticPrompt(String input, List<GeneratedCaseDto> cases) {
        return """
                你是一个专业的测试质量评审专家(Critic)。请评审以下测试用例的质量。

                需求：""" + input + """

                生成的测试用例：""" + JSON.toJSONString(cases) + """

                请以 JSON 格式返回评审结果：
                - score: 评分(0-100)
                - issues: 发现的问题列表
                - retryCount: 需要重试的次数(0表示通过)

                只返回 JSON，不要添加其他文字。
                """;
    }

    // ──── LLM calls ────

    private JSONObject callLlm(String prompt) {
        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        log.debug("LLM response for prompt: {}", response);
        return parseJsonResponse(response);
    }

    private List<GeneratedCaseDto> callLlmForCases(String input, JSONObject e1Result, JSONObject e2Result) {
        String prompt = e3Prompt(input, e1Result, e2Result);
        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        log.debug("LLM E3 response: {}", response);
        return parseCasesResponse(response);
    }

    private List<GeneratedCaseDto> callLlmForCasesFromInput(String input) {
        String prompt = e3PromptFromInput(input);
        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        log.debug("LLM E3 from-input response: {}", response);
        return parseCasesResponse(response);
    }

    private int callLlmForCriticScore(String input, List<GeneratedCaseDto> cases) {
        try {
            String prompt = criticPrompt(input, cases);
            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
            JSONObject result = parseJsonResponse(response);
            return result.getIntValue("score");
        } catch (Exception e) {
            log.warn("Critic LLM call failed, defaulting to score 80: {}", e.getMessage());
            return 80;
        }
    }

    // ──── Response parsing ────

    private JSONObject parseJsonResponse(String response) {
        if (response == null || response.isBlank()) {
            throw new RuntimeException("LLM returned empty response");
        }
        // Strip markdown code block wrapper if present
        String cleaned = response.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();
        try {
            return JSON.parseObject(cleaned);
        } catch (Exception e) {
            // Try parsing as array and wrapping
            try {
                JSONArray arr = JSON.parseArray(cleaned);
                JSONObject wrapper = new JSONObject();
                wrapper.put("items", arr);
                return wrapper;
            } catch (Exception e2) {
                throw new RuntimeException("Failed to parse LLM response as JSON: " + response, e2);
            }
        }
    }

    private List<GeneratedCaseDto> parseCasesResponse(String response) {
        try {
            return GeneratedCaseJsonMapper.parseCases(response, fallback.defaultCases());
        } catch (Exception e) {
            log.warn("Failed to parse cases response, using fallback: {}", e.getMessage());
            return fallback.defaultCases();
        }
    }

    // ──── Prompt helpers ────

    private String buildE2PromptWithFeedback(String basePrompt, String feedback) {
        if (feedback == null || feedback.isBlank()) {
            return basePrompt;
        }
        return basePrompt + "\n\n用户反馈：" + feedback;
    }

    private String buildE3PromptWithFeedback(String basePrompt, String feedback) {
        if (feedback == null || feedback.isBlank()) {
            return basePrompt;
        }
        return basePrompt + "\n\n用户反馈：" + feedback;
    }

    private Object safeParseJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return JSON.parse(json);
        } catch (Exception e) {
            log.debug("Failed to parse stored JSON: {}", e.getMessage());
            return null;
        }
    }

    private String stringifyJson(Object value) {
        return value == null ? "无" : JSON.toJSONString(value);
    }

    private List<GeneratedCaseDto> callLlmForCasesWithPrompt(String prompt) {
        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        log.debug("LLM E3 response: {}", response);
        return parseCasesResponse(response);
    }

    // ──── Helper ────

    private GenerateSseEventDto event(String taskId, GenerateSseEventName type, String stage, long sequence, Object payload) {
        return new GenerateSseEventDto(type, taskId, stage, sequence, LocalDateTime.now(), payload);
    }
}
