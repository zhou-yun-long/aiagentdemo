package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_CHUNK;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.service.treeify.agent.JsonOutputParser;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageAgent;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageContext;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Orchestrates generation stages (E1 → E2 → E3 → Critic) using StageAgent implementations.
 * Fetches project summary and RAG context to enrich generation prompts.
 */
public class OrchestrationService implements TreeifyGenerationService {

    private static final Logger log = LoggerFactory.getLogger(OrchestrationService.class);

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

    @Override
    public List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                                  String e1Result, String e2Result, String feedback, Long projectId) {
        if (!llmAvailable) {
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
        try {
            return orchestrate(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        } catch (Exception e) {
            log.warn("AI generation failed for task {}, falling back to mock: {}", taskId, e.getMessage());
            return fallback.buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId);
        }
    }

    private List<GenerateSseEventDto> orchestrate(String taskId, String mode, String input, String currentStage,
                                                    String e1Result, String e2Result, String feedback, Long projectId) {
        StageContext baseCtx = buildContext(taskId, input, projectId);
        if (!"step".equals(mode)) {
            return buildAutoEvents(taskId, input, baseCtx);
        }
        String stage = currentStage != null ? currentStage : "e1";
        return switch (stage) {
            case "e2" -> buildStepE2Events(taskId, input, e1Result, feedback, baseCtx);
            case "e3", "critic" -> buildStepFinalEvents(taskId, input, e1Result, e2Result, feedback, baseCtx);
            default -> buildStepE1Events(taskId, input, baseCtx);
        };
    }

    // ──── Context building ────

    private StageContext buildContext(String taskId, String input, Long projectId) {
        String summary = "";
        String ragContext = "";
        if (projectId != null) {
            CompletableFuture<String> summaryFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    var dto = summaryService.getCurrent(projectId);
                    return (dto != null && dto.content() != null) ? JsonOutputParser.truncate(dto.content(), 800) : "";
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

    // ──── Auto mode: all stages in sequence ────

    private List<GenerateSseEventDto> buildAutoEvents(String taskId, String input, StageContext ctx) {
        long seq = 1;
        List<GenerateSseEventDto> events = new ArrayList<>();

        // E1
        StageResult e1 = executeStage("e1", ctx);
        ctx = ctx.withResult("e1", e1.data());
        events.add(event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")));
        events.add(event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", e1.content())));
        events.add(event(taskId, STAGE_DONE, "e1", seq++, Map.of("needConfirm", false, "result", e1.data())));

        // E2
        StageResult e2 = executeStage("e2", ctx);
        ctx = ctx.withResult("e2", e2.data());
        events.add(event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")));
        events.add(event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", e2.content())));
        events.add(event(taskId, STAGE_DONE, "e2", seq++, Map.of("needConfirm", false, "result", e2.data())));

        // E3
        StageResult e3 = executeStage("e3", ctx);
        ctx = ctx.withResult("e3", e3.data());
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", e3.content())));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", e3.data())));

        // Critic
        StageResult critic = executeStage("critic", ctx);
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of("needConfirm", false, "result", critic.data())));

        // Complete
        int score = extractScore(critic.data());
        List<GeneratedCaseDto> cases = extractCases(e3.data());
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", score, "cases", cases)));

        return events;
    }

    // ──── Step mode: individual stages ────

    private List<GenerateSseEventDto> buildStepE1Events(String taskId, String input, StageContext ctx) {
        long seq = 1;
        StageResult e1 = executeStage("e1", ctx);
        return List.of(
                event(taskId, STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")),
                event(taskId, STAGE_CHUNK, "e1", seq++, Map.of("content", e1.content())),
                event(taskId, STAGE_DONE, "e1", seq++, Map.of("needConfirm", true, "result", e1.data()))
        );
    }

    private List<GenerateSseEventDto> buildStepE2Events(String taskId, String input, String e1Result, String feedback, StageContext ctx) {
        long seq = 4;
        ctx = ctx.withFeedback(feedback).withResult("e1", e1Result);
        StageResult e2 = executeStage("e2", ctx);
        return List.of(
                event(taskId, STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")),
                event(taskId, STAGE_CHUNK, "e2", seq++, Map.of("content", e2.content())),
                event(taskId, STAGE_DONE, "e2", seq++, Map.of("needConfirm", true, "result", e2.data()))
        );
    }

    private List<GenerateSseEventDto> buildStepFinalEvents(String taskId, String input, String e1Result, String e2Result, String feedback, StageContext ctx) {
        long seq = 7;
        List<GenerateSseEventDto> events = new ArrayList<>();
        ctx = ctx.withFeedback(feedback).withResult("e1", e1Result).withResult("e2", e2Result);

        // E3
        StageResult e3 = executeStage("e3", ctx);
        ctx = ctx.withResult("e3", e3.data());
        events.add(event(taskId, STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")));
        events.add(event(taskId, STAGE_CHUNK, "e3", seq++, Map.of("content", e3.content())));
        events.add(event(taskId, STAGE_DONE, "e3", seq++, Map.of("needConfirm", false, "result", e3.data())));

        // Critic
        StageResult critic = executeStage("critic", ctx);
        events.add(event(taskId, STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")));
        events.add(event(taskId, STAGE_DONE, "critic", seq++, Map.of("needConfirm", false, "result", critic.data())));

        // Complete
        int score = extractScore(critic.data());
        List<GeneratedCaseDto> cases = extractCases(e3.data());
        events.add(event(taskId, GENERATION_COMPLETE, null, seq++, Map.of("criticScore", score, "cases", cases)));

        return events;
    }

    // ──── Stage execution ────

    private StageResult executeStage(String stageName, StageContext context) {
        StageAgent agent = agents.get(stageName);
        if (agent == null) {
            throw new IllegalStateException("No StageAgent registered for stage: " + stageName);
        }
        return agent.execute(context);
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
        if (data instanceof com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto report) {
            return report.score();
        }
        return 80;
    }

    private GenerateSseEventDto event(String taskId, GenerateSseEventName type, String stage, long sequence, Object payload) {
        return new GenerateSseEventDto(type, taskId, stage, sequence, LocalDateTime.now(), payload);
    }
}
