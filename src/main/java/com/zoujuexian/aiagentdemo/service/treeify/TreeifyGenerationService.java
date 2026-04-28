package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import reactor.core.publisher.Flux;

import java.util.List;

/**
 * Contract for speccase generation event building.
 * Implementations can be mock (template-based) or real (LLM-orchestrated).
 */
public interface TreeifyGenerationService {

    /**
     * Build an ordered list of SSE events for a generation task (synchronous).
     *
     * @param taskId       the task UUID
     * @param mode         "auto" or "step"
     * @param input        the requirement text from the user
     * @param currentStage null for fresh tasks; "e2"/"e3"/"critic" for step-mode resume
     * @param e1Result     persisted E1 result JSON (null for first stage)
     * @param e2Result     persisted E2 result JSON (null for first/second stage)
     * @param feedback     user feedback from confirm step (null if none)
     * @param projectId    project ID for fetching summary/RAG context (null to skip)
     * @return ordered SSE events to emit via the stream endpoint
     */
    List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                          String e1Result, String e2Result, String feedback, Long projectId);

    /**
     * Stream SSE events for a generation task in real-time (reactive).
     * Default implementation wraps the synchronous {@link #buildEvents} in a Flux.
     * Implementations that support real LLM streaming should override this.
     */
    default Flux<GenerateSseEventDto> streamEvents(String taskId, String mode, String input, String currentStage,
                                                    String e1Result, String e2Result, String feedback, Long projectId) {
        return Flux.fromIterable(buildEvents(taskId, mode, input, currentStage, e1Result, e2Result, feedback, projectId));
    }
}
