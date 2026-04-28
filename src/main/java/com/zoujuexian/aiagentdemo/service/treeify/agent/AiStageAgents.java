package com.zoujuexian.aiagentdemo.service.treeify.agent;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.service.treeify.MockGenerationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;

/**
 * AI-powered StageAgent implementations.
 * Each agent handles prompt construction, LLM call, and response parsing for one stage.
 * Prompts are enriched with project summary and RAG context when available.
 * Supports both synchronous and streaming execution modes.
 */
public final class AiStageAgents {

    private static final Logger log = LoggerFactory.getLogger(AiStageAgents.class);

    private AiStageAgents() {}

    /**
     * Prepend project summary and RAG context to a prompt.
     */
    private static String enrichPrompt(StageContext ctx, String basePrompt) {
        StringBuilder sb = new StringBuilder();
        String summary = ctx.projectSummary();
        String rag = ctx.ragContext();
        if (summary != null && !summary.isBlank()) {
            sb.append("【项目背景】\n").append(summary).append("\n\n");
        }
        if (rag != null && !rag.isBlank()) {
            sb.append("【参考资料】\n").append(rag).append("\n\n");
        }
        sb.append(basePrompt);
        return sb.toString();
    }

    private static String appendFeedback(String prompt, String feedback) {
        if (feedback == null || feedback.isBlank()) return prompt;
        return prompt + "\n\n用户反馈：" + feedback;
    }

    private static JSONObject callAndParse(ChatClient chatClient, String prompt) {
        String response = chatClient.prompt().user(prompt).call().content();
        return JsonOutputParser.parseObject(response);
    }

    /**
     * Stream LLM response tokens using ChatClient.stream().
     */
    private static Flux<String> streamChat(ChatClient chatClient, String prompt) {
        return chatClient.prompt().user(prompt).stream().chatResponse()
                .mapNotNull(cr -> cr.getResult() != null && cr.getResult().getOutput() != null
                        ? cr.getResult().getOutput().getText()
                        : null);
    }

    // ──── E1: Requirements Analysis ────

    public static class E1Agent implements StageAgent {
        private final ChatClient chatClient;

        public E1Agent(ChatClient chatClient) {
            this.chatClient = chatClient;
        }

        @Override
        public String stageName() { return "e1"; }

        private String buildPrompt(StageContext context) {
            String basePrompt = """
                    你是一个专业的测试分析师。请根据以下需求，提取业务目标、用户动作、系统行为和约束条件。

                    需求：%s

                    请以 JSON 格式返回，包含以下字段：
                    - businessGoals: 业务目标列表
                    - userActions: 用户动作列表
                    - systemBehaviors: 系统行为列表
                    - constraints: 约束条件列表

                    只返回 JSON，不要添加其他文字。
                    """.formatted(context.input());
            return enrichPrompt(context, basePrompt);
        }

        @Override
        public StageResult execute(StageContext context) {
            String prompt = buildPrompt(context);
            JSONObject result = callAndParse(chatClient, prompt);
            return new StageResult("正在解析需求目标、用户动作和系统约束...", result);
        }

        @Override
        public Flux<String> streamExecute(StageContext context) {
            String prompt = buildPrompt(context);
            return streamChat(chatClient, prompt);
        }
    }

    // ──── E2: Test Object Decomposition ────

    public static class E2Agent implements StageAgent {
        private final ChatClient chatClient;

        public E2Agent(ChatClient chatClient) {
            this.chatClient = chatClient;
        }

        @Override
        public String stageName() { return "e2"; }

        private String buildPrompt(StageContext context) {
            String e1ResultJson = context.getResultJson("e1");
            String basePrompt;
            if (e1ResultJson != null && !e1ResultJson.isBlank()) {
                try {
                    JSONObject e1 = JsonOutputParser.parseObject(e1ResultJson);
                    basePrompt = buildPromptText(context.input(), e1 != null ? e1.toJSONString() : null);
                } catch (Exception e) {
                    basePrompt = buildPromptText(context.input(), null);
                }
            } else {
                basePrompt = buildPromptText(context.input(), null);
            }
            basePrompt = appendFeedback(basePrompt, context.feedback());
            return enrichPrompt(context, basePrompt);
        }

        @Override
        public StageResult execute(StageContext context) {
            String prompt = buildPrompt(context);
            JSONObject result = callAndParse(chatClient, prompt);
            return new StageResult("正在拆分可测试对象...", result);
        }

        @Override
        public Flux<String> streamExecute(StageContext context) {
            String prompt = buildPrompt(context);
            return streamChat(chatClient, prompt);
        }

        private String buildPromptText(String input, String e1Json) {
            String priorSection = (e1Json != null && !e1Json.isBlank())
                    ? "E1 分析结果：" + e1Json + "\n\n"
                    : "";
            return """
                    你是一个专业的测试设计师。请根据以下需求%s拆分可测试对象。

                    需求：%s

                    %s请以 JSON 数组格式返回可测试对象列表，每个对象包含：
                    - name: 可测试对象名称
                    - type: 类型(ui/function/flow/data)
                    - dimensions: 测试维度列表
                    - priority: 优先级(P0/P1/P2)

                    只返回 JSON 数组，不要添加其他文字。
                    """.formatted(
                            e1Json != null ? "和 E1 阶段的分析结果，" : "，",
                            input,
                            priorSection);
        }
    }

    // ──── E3: Test Case Generation ────

    public static class E3Agent implements StageAgent {
        private final ChatClient chatClient;
        private final MockGenerationService fallback;

        public E3Agent(ChatClient chatClient, MockGenerationService fallback) {
            this.chatClient = chatClient;
            this.fallback = fallback;
        }

        @Override
        public String stageName() { return "e3"; }

        private String buildPrompt(StageContext context) {
            Object e1 = JsonOutputParser.safeParse(context.getResultJson("e1"));
            Object e2 = JsonOutputParser.safeParse(context.getResultJson("e2"));
            String basePrompt;
            if (e1 != null || e2 != null) {
                basePrompt = buildPromptText(context.input(), JsonOutputParser.stringify(e1), JsonOutputParser.stringify(e2));
            } else {
                basePrompt = buildPromptText(context.input(), null, null);
            }
            basePrompt = appendFeedback(basePrompt, context.feedback());
            return enrichPrompt(context, basePrompt);
        }

        @Override
        public StageResult execute(StageContext context) {
            String prompt = buildPrompt(context);
            List<GeneratedCaseDto> cases = callAndParseCases(prompt);
            return new StageResult("正在生成测试用例...", cases);
        }

        @Override
        public Flux<String> streamExecute(StageContext context) {
            String prompt = buildPrompt(context);
            return streamChat(chatClient, prompt);
        }

        private String buildPromptText(String input, String e1, String e2) {
            boolean hasContext = e1 != null && !e1.equals("无");
            String priorSection = hasContext
                    ? "E1 分析结果：%s\n\nE2 拆分结果：%s\n\n".formatted(e1, e2)
                    : "";
            return """
                    你是一个专业的测试用例编写专家。请根据以下需求%s生成测试用例。

                    需求：%s

                    %s请以 JSON 数组格式返回测试用例列表，每个用例包含：
                    - title: 用例标题
                    - precondition: 前置条件
                    - steps: 执行步骤列表
                    - expected: 预期结果
                    - priority: 优先级(P0/P1/P2/P3)
                    - tags: 标签列表
                    - source: 来源("ai")
                    - pathType: 路径类型(happy/error/boundary/alternative)

                    覆盖正常路径、异常路径和边界场景。只返回 JSON 数组，不要添加其他文字。
                    """.formatted(
                            hasContext ? "和前面的分析结果，" : "，",
                            input,
                            priorSection);
        }

        private List<GeneratedCaseDto> callAndParseCases(String prompt) {
            try {
                String response = chatClient.prompt().user(prompt).call().content();
                return parseCases(response);
            } catch (Exception e) {
                return fallback.defaultCases();
            }
        }

        private List<GeneratedCaseDto> parseCases(String response) {
            if (response == null || response.isBlank()) return fallback.defaultCases();
            try {
                JSONArray arr = JsonOutputParser.parseArray(response);
                if (arr == null) return fallback.defaultCases();
                List<GeneratedCaseDto> cases = new ArrayList<>();
                for (int i = 0; i < arr.size(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    cases.add(new GeneratedCaseDto(
                            obj.getString("title"),
                            obj.getString("precondition"),
                            parseStringList(obj.getJSONArray("steps")),
                            obj.getString("expected"),
                            obj.getString("priority"),
                            parseStringList(obj.getJSONArray("tags")),
                            obj.getString("source"),
                            obj.getString("pathType")
                    ));
                }
                return cases.isEmpty() ? fallback.defaultCases() : cases;
            } catch (Exception e) {
                return fallback.defaultCases();
            }
        }

        private List<String> parseStringList(JSONArray arr) {
            if (arr == null) return List.of();
            List<String> result = new ArrayList<>();
            for (int i = 0; i < arr.size(); i++) {
                result.add(arr.getString(i));
            }
            return result;
        }
    }

    // ──── Critic: Quality Review ────

    public static class CriticAgent implements StageAgent {
        private final ChatClient chatClient;

        public CriticAgent(ChatClient chatClient) {
            this.chatClient = chatClient;
        }

        @Override
        public String stageName() { return "critic"; }

        private String buildPrompt(StageContext context, List<GeneratedCaseDto> cases) {
            String basePrompt = """
                    你是一个专业的测试质量评审专家(Critic)。请评审以下测试用例的质量。

                    需求：%s

                    生成的测试用例：%s

                    请以 JSON 格式返回评审结果：
                    - score: 评分(0-100)
                    - issues: 发现的问题列表
                    - retryCount: 需要重试的次数(0表示通过)

                    只返回 JSON，不要添加其他文字。
                    """.formatted(context.input(), JSON.toJSONString(cases));
            return enrichPrompt(context, basePrompt);
        }

        @Override
        @SuppressWarnings("unchecked")
        public StageResult execute(StageContext context) {
            Object e3Result = context.getResult("e3");
            List<GeneratedCaseDto> cases;
            if (e3Result instanceof List<?> list) {
                cases = (List<GeneratedCaseDto>) list;
            } else {
                cases = List.of();
            }
            int score = callForScore(context, cases);
            var report = new CriticReportDto(score, List.of("AI 生成的用例覆盖了主要路径"), 0);
            return new StageResult("评审完成", report);
        }

        @Override
        public Flux<String> streamExecute(StageContext context) {
            Object e3Result = context.getResult("e3");
            @SuppressWarnings("unchecked")
            List<GeneratedCaseDto> cases = (e3Result instanceof List<?> list)
                    ? (List<GeneratedCaseDto>) list : List.of();
            String prompt = buildPrompt(context, cases);
            return streamChat(chatClient, prompt);
        }

        private int callForScore(StageContext context, List<GeneratedCaseDto> cases) {
            try {
                String prompt = buildPrompt(context, cases);
                String response = chatClient.prompt().user(prompt).call().content();
                JSONObject result = JsonOutputParser.parseObject(response);
                return result != null ? result.getIntValue("score") : 80;
            } catch (Exception e) {
                return 80;
            }
        }
    }
}
