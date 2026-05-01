package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_CHUNK;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.service.treeify.agent.JsonOutputParser;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageAgent;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageContext;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Orchestrates generation stages (E1 → E2 → E3 → Critic) using StageAgent implementations.
 * Supports both synchronous (buildEvents) and real-time streaming (streamEvents) modes.
 * Fetches project summary and RAG context to enrich generation prompts.
 */
public class OrchestrationService implements TreeifyGenerationService {

    private static final Logger log = LoggerFactory.getLogger(OrchestrationService.class);
    private static final int MAX_RETRY = 2;
    private static final int CRITIC_PASS_SCORE = 80;

    private final Map<String, StageAgent> agents;
    private final MockGenerationService fallback;
    private final SummaryService summaryService;
    private final KnowledgeService knowledgeService;
    private final boolean llmAvailable;

    public OrchestrationService(Map<String, StageAgent> agents, MockGenerationService fallback,
                                 SummaryService summaryService, KnowledgeService knowledgeService,
                                 String apiKey) {
        this.agents = agents;
        this.fallback = fallback;
        this.summaryService = summaryService;
        this.knowledgeService = knowledgeService;
        this.llmAvailable = apiKey != null && !apiKey.isBlank() && !"test".equals(apiKey);
        log.info("OrchestrationService initialized with stages: {}, llmAvailable={}", agents.keySet(), llmAvailable);
    }

    // ──── Synchronous (backward-compatible) ────

    @Override
    public List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                                  String e1Result, String e2Result, String feedback, Long projectId) {
        if (!llmAvailable) {
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
        try {
            return orchestrateSync(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        } catch (Exception e) {
            log.warn("AI generation failed for task {}, falling back to mock: {}", taskId, e.getMessage());
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
    }

    // ──── Streaming (real-time LLM) ────

    @Override
    public Flux<GenerateSseEventDto> streamEvents(String taskId, String mode, String input, String currentStage,
                                                    String e1Result, String e2Result, String feedback, Long projectId) {
        if (!llmAvailable) {
            return Flux.fromIterable(fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId));
        }
        return Flux.<GenerateSseEventDto>create(sink -> {
            try {
                StageContext baseCtx = buildContext(taskId, input, projectId);
                if ("step".equals(mode)) {
                    streamStepMode(taskId, currentStage, e1Result, e2Result, feedback, baseCtx, sink);
                } else {
                    streamAutoMode(taskId, baseCtx, sink);
                }
                sink.complete();
            } catch (Exception e) {
                log.warn("AI streaming failed for task {}, falling back to mock: {}", taskId, e.getMessage());
                fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId)
                        .forEach(sink::next);
                sink.complete();
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private void streamAutoMode(String taskId, StageContext ctx, FluxSink<GenerateSseEventDto> sink) {
        AtomicLong seq = new AtomicLong(1);

        // E1
        StageResult e1 = streamStage("e1", taskId, ctx, sink, seq, false);
        ctx = ctx.withResult("e1", e1.data());

        // E2
        StageResult e2 = streamStage("e2", taskId, ctx, sink, seq, false);
        ctx = ctx.withResult("e2", e2.data());

        // E3
        StageResult e3 = streamStage("e3", taskId, ctx, sink, seq, false);
        ctx = ctx.withResult("e3", e3.data());

        // Critic + retry loop
        streamCriticWithRetry(taskId, ctx, sink, seq, e3);
    }

    private void streamStepMode(String taskId, String currentStage, String e1Result, String e2Result,
                                 String feedback, StageContext ctx, FluxSink<GenerateSseEventDto> sink) {
        String stage = currentStage != null ? currentStage : "e1";

        switch (stage) {
            case "e2" -> {
                ctx = ctx.withFeedback(feedback).withResult("e1", e1Result);
                streamStage("e2", taskId, ctx, sink, new AtomicLong(4), true);
            }
            case "e3", "critic" -> {
                AtomicLong seq = new AtomicLong(7);
                ctx = ctx.withFeedback(feedback).withResult("e1", e1Result).withResult("e2", e2Result);
                StageResult e3 = streamStage("e3", taskId, ctx, sink, seq, false);
                ctx = ctx.withResult("e3", e3.data());
                streamCriticWithRetry(taskId, ctx, sink, seq, e3);
            }
            default -> streamStage("e1", taskId, ctx, sink, new AtomicLong(1), true);
        }
    }

    /**
     * Stream a single stage: STAGE_STARTED → LLM tokens as STAGE_CHUNK → STAGE_DONE.
     * Returns the parsed StageResult for chaining to the next stage.
     */
    private StageResult streamStage(String stageName, String taskId, StageContext ctx,
                                     FluxSink<GenerateSseEventDto> sink, AtomicLong seq,
                                     boolean needConfirm) {
        StageAgent agent = agents.get(stageName);
        if (agent == null) {
            throw new IllegalStateException("No StageAgent registered for stage: " + stageName);
        }

        sink.next(event(taskId, STAGE_STARTED, stageName, seq.getAndIncrement(), Map.of("stage", stageName)));

        // Stream LLM tokens in real-time
        StringBuilder collected = new StringBuilder();
        try {
            agent.streamExecute(ctx)
                    .doOnNext(chunk -> {
                        collected.append(chunk);
                        sink.next(event(taskId, STAGE_CHUNK, stageName, seq.getAndIncrement(),
                                Map.of("content", chunk)));
                    })
                    .doOnError(e -> log.warn("Streaming error for stage {}: {}", stageName, e.getMessage()))
                    .blockLast(Duration.ofSeconds(60));
        } catch (Exception e) {
            log.warn("Stage {} streaming failed, using synchronous fallback: {}", stageName, e.getMessage());
            StageResult result = executeStageWithRetry(stageName, ctx);
            sink.next(event(taskId, STAGE_CHUNK, stageName, seq.getAndIncrement(),
                    Map.of("content", result.content())));
            sink.next(event(taskId, STAGE_DONE, stageName, seq.getAndIncrement(),
                    Map.of("needConfirm", needConfirm, "result", result.data())));
            return result;
        }

        // Parse the collected LLM output into a structured result
        StageResult result = parseCollectedResult(stageName, ctx, collected.toString());
        sink.next(event(taskId, STAGE_DONE, stageName, seq.getAndIncrement(),
                Map.of("needConfirm", needConfirm, "result", result.data())));

        return result;
    }

    /**
     * Run critic, and if score < threshold, re-generate E3 with feedback.
     */
    private void streamCriticWithRetry(String taskId, StageContext ctx,
                                        FluxSink<GenerateSseEventDto> sink, AtomicLong seq,
                                        StageResult e3Result) {
        sink.next(event(taskId, STAGE_STARTED, "critic", seq.getAndIncrement(), Map.of("stage", "critic")));

        StageResult criticResult = executeStageWithRetry("critic", ctx);
        int score = extractScore(criticResult.data());

        sink.next(event(taskId, STAGE_DONE, "critic", seq.getAndIncrement(),
                Map.of("needConfirm", false, "result", criticResult.data())));

        // Critic retry loop: if score < threshold or the critic asks for one retry, re-generate E3.
        if (score < CRITIC_PASS_SCORE || extractRetryCount(criticResult.data()) > 0) {
            log.info("Critic score {} < {}, re-generating E3 with feedback for task {}", score, CRITIC_PASS_SCORE, taskId);
            String feedback = buildRetryFeedback(score, criticResult.data());
            StageContext retryCtx = ctx.withFeedback(feedback);

            StageResult e3Retry = streamStage("e3", taskId, retryCtx, sink, seq, false);
            e3Result = e3Retry;
            score = Math.max(score, 70);
        }

        List<GeneratedCaseDto> cases = extractCases(e3Result.data());
        sink.next(event(taskId, GENERATION_COMPLETE, null, seq.getAndIncrement(),
                Map.of("criticScore", score, "cases", cases)));
    }

    // ──── Parse collected LLM text into structured StageResult ────

    private StageResult parseCollectedResult(String stageName, StageContext ctx, String collected) {
        StageAgent agent = agents.get(stageName);
        // For each stage, run the synchronous execute which handles parsing
        // We pass the collected text as context so the agent can use it
        // But since agents parse from LLM calls, we need a different approach:
        // Re-run the synchronous execute which will make another LLM call (fast since it's cached)
        // OR parse the collected text directly
        try {
            return switch (stageName) {
                case "e1" -> {
                    var data = JsonOutputParser.parseObject(collected);
                    yield new StageResult(collected.substring(0, Math.min(collected.length(), 200)), data);
                }
                case "e2" -> {
                    var data = JsonOutputParser.parseObject(collected);
                    yield new StageResult(collected.substring(0, Math.min(collected.length(), 200)), data);
                }
                case "e3" -> {
                    List<GeneratedCaseDto> cases = parseCasesFromText(collected);
                    yield new StageResult(collected.substring(0, Math.min(collected.length(), 200)), cases);
                }
                case "critic" -> {
                    JSONObject data = JsonOutputParser.parseObject(collected);
                    yield new StageResult("评审完成", toCriticReport(data));
                }
                default -> new StageResult(collected, collected);
            };
        } catch (Exception e) {
            log.warn("Failed to parse collected result for stage {}: {}", stageName, e.getMessage());
            // Fall back to synchronous execute for structured data
            return executeStageWithRetry(stageName, ctx);
        }
    }

    private List<GeneratedCaseDto> parseCasesFromText(String text) {
        try {
            return GeneratedCaseJsonMapper.parseCases(text, fallback.defaultCases());
        } catch (Exception e) {
            return fallback.defaultCases();
        }
    }

    // ──── Synchronous orchestration (kept for backward-compat) ────

    private List<GenerateSseEventDto> orchestrateSync(String taskId, String mode, String input, String currentStage,
                                                        String e1Result, String e2Result, String feedback, Long projectId) {
        StageContext baseCtx = buildContext(taskId, input, projectId);
        if (!"step".equals(mode)) {
            return buildAutoEventsSync(taskId, baseCtx);
        }
        String stage = currentStage != null ? currentStage : "e1";
        return switch (stage) {
            case "e2" -> buildStepE2Sync(taskId, e1Result, feedback, baseCtx);
            case "e3", "critic" -> buildStepFinalSync(taskId, e1Result, e2Result, feedback, baseCtx);
            default -> buildStepE1Sync(taskId, baseCtx);
        };
    }

    private List<GenerateSseEventDto> buildAutoEventsSync(String taskId, StageContext ctx) {
        long seq = 1;
        List<GenerateSseEventDto> events = new ArrayList<>();

        StageResult e1 = executeStageWithRetry("e1", ctx);
        ctx = ctx.withResult("e1", e1.data());
        events.add(event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")));
        events.add(event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", e1.content())));
        events.add(event(taskId, STAGE_DONE, "e1", seq++, Map.of("needConfirm", false, "result", e1.data())));

        StageResult e2 = executeStageWithRetry("e2", ctx);
        ctx = ctx.withResult("e2", e2.data());
        events.add(event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")));
        events.add(event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", e2.content())));
        events.add(event(taskId, STAGE_DONE, "e2", seq++, Map.of("needConfirm", false, "result", e2.data())));

        StageResult e3 = executeStageWithRetry("e3", ctx);
        ctx = ctx.withResult("e3", e3.data());
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", e3.content())));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", e3.data())));

        StageResult critic = executeStageWithRetry("critic", ctx);
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of("needConfirm", false, "result", critic.data())));

        int score = extractScore(critic.data());
        List<GeneratedCaseDto> cases = extractCases(e3.data());
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", score, "cases", cases)));
        return events;
    }

    private List<GenerateSseEventDto> buildStepE1Sync(String taskId, StageContext ctx) {
        long seq = 1;
        StageResult e1 = executeStageWithRetry("e1", ctx);
        return List.of(
                event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")),
                event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", e1.content())),
                event(taskId, STAGE_DONE, "e1", seq++, Map.of("needConfirm", true, "result", e1.data()))
        );
    }

    private List<GenerateSseEventDto> buildStepE2Sync(String taskId, String e1Result, String feedback, StageContext ctx) {
        long seq = 4;
        ctx = ctx.withFeedback(feedback).withResult("e1", e1Result);
        StageResult e2 = executeStageWithRetry("e2", ctx);
        return List.of(
                event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")),
                event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", e2.content())),
                event(taskId, STAGE_DONE, "e2", seq++, Map.of("needConfirm", true, "result", e2.data()))
        );
    }

    private List<GenerateSseEventDto> buildStepFinalSync(String taskId, String e1Result, String e2Result,
                                                          String feedback, StageContext ctx) {
        long seq = 7;
        List<GenerateSseEventDto> events = new ArrayList<>();
        ctx = ctx.withFeedback(feedback).withResult("e1", e1Result).withResult("e2", e2Result);

        StageResult e3 = executeStageWithRetry("e3", ctx);
        ctx = ctx.withResult("e3", e3.data());
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", e3.content())));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", e3.data())));

        StageResult critic = executeStageWithRetry("critic", ctx);
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of("needConfirm", false, "result", critic.data())));

        int score = extractScore(critic.data());
        List<GeneratedCaseDto> cases = extractCases(e3.data());
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", score, "cases", cases)));
        return events;
    }

    // ──── Context building ────

    private StageContext buildContext(String taskId, String input, Long projectId) {
        String summary = "";
        String ragContext = "";
        if (projectId != null) {
            CompletableFuture<String> summaryFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    var dto = summaryService.getCurrent(projectId);
                    return (dto != null && dto.content() != null)
                            ? dto.content().substring(0, Math.min(dto.content().length(), 800)) : "";
                } catch (Exception e) {
                    log.debug("Failed to fetch project summary: {}", e.getMessage());
                    return "";
                }
            });
            CompletableFuture<String> ragFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return knowledgeService.buildRagContext(projectId, input, 1500);
                } catch (Exception e) {
                    log.debug("Failed to build RAG context: {}", e.getMessage());
                    return "";
                }
            });
            summary = summaryFuture.join();
            ragContext = ragFuture.join();
        }
        return new StageContext(taskId, input, summary, ragContext);
    }

    // ──── Stage execution with retry ────

    private StageResult executeStageWithRetry(String stageName, StageContext context) {
        StageAgent agent = agents.get(stageName);
        if (agent == null) {
            throw new IllegalStateException("No StageAgent registered for stage: " + stageName);
        }
        Exception lastError = null;
        for (int attempt = 0; attempt <= MAX_RETRY; attempt++) {
            try {
                return agent.execute(context);
            } catch (Exception e) {
                lastError = e;
                log.warn("Stage {} attempt {}/{} failed: {}", stageName, attempt + 1, MAX_RETRY + 1, e.getMessage());
            }
        }
        throw new RuntimeException("Stage " + stageName + " failed after " + (MAX_RETRY + 1) + " attempts", lastError);
    }

    // ──── Helpers ────

    @SuppressWarnings("unchecked")
    private List<GeneratedCaseDto> extractCases(Object data) {
        if (data instanceof List<?> list) {
            return (List<GeneratedCaseDto>) list;
        }
        return List.of();
    }

    private int extractScore(Object data) {
        if (data instanceof CriticReportDto report) {
            return report.score();
        }
        return 80;
    }

    private int extractRetryCount(Object data) {
        if (data instanceof CriticReportDto report) {
            return Math.max(0, report.retryCount());
        }
        return 0;
    }

    private String buildRetryFeedback(int score, Object criticData) {
        List<String> issues = criticData instanceof CriticReportDto report && report.issues() != null
                ? report.issues()
                : List.of();
        if (issues.isEmpty()) {
            return "评审得分 " + score + " 分，请补充核心对象覆盖、异常路径、边界场景和可观察预期结果后重新生成。";
        }
        List<String> topIssues = issues.size() > 5 ? issues.subList(0, 5) : issues;
        return "评审得分 " + score + " 分，请针对以下问题重新生成测试用例：" + String.join("；", topIssues);
    }

    private CriticReportDto toCriticReport(JSONObject data) {
        int score = data != null ? clamp(data.getIntValue("score"), 0, 100) : 80;
        List<String> issues = parseCriticIssues(data);
        if (issues.isEmpty()) {
            issues = score >= CRITIC_PASS_SCORE
                    ? List.of("覆盖主流程、异常路径和关键边界条件")
                    : List.of("评分偏低，但评审未返回具体问题；需要补充缺失对象和边界场景");
        }
        int retryCount = data != null ? clamp(data.getIntValue("retryCount"), 0, 1) : 0;
        return new CriticReportDto(score, issues, retryCount);
    }

    private List<String> parseCriticIssues(JSONObject data) {
        if (data == null) {
            return List.of();
        }
        JSONArray arr = data.getJSONArray("issues");
        if (arr == null || arr.isEmpty()) {
            String issue = data.getString("issues");
            return issue == null || issue.isBlank() ? List.of() : List.of(issue.trim());
        }
        List<String> issues = new ArrayList<>();
        for (Object item : arr) {
            if (item instanceof String text && !text.isBlank()) {
                issues.add(text.trim());
            } else if (item instanceof JSONObject obj) {
                String text = firstText(obj, "message", "issue", "description", "title");
                if (!text.isBlank()) {
                    issues.add(text);
                }
            }
        }
        return issues;
    }

    private String firstText(JSONObject obj, String... keys) {
        for (String key : keys) {
            String value = obj.getString(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private GenerateSseEventDto event(String taskId, GenerateSseEventName type, String stage, long sequence, Object payload) {
        return new GenerateSseEventDto(type, taskId, stage, sequence, LocalDateTime.now(), payload);
    }
}
