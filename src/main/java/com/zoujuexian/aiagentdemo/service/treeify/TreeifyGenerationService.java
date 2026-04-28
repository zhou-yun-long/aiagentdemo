package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import java.util.List;

/**
 * Contract for speccase generation event building.
 * Implementations can be mock (template-based) or real (LLM-orchestrated).
 */
public interface TreeifyGenerationService {

    /**
     * Build an ordered list of SSE events for a generation task.
     *
     * @param taskId       the task UUID
     * @param mode         "auto" or "step"
     * @param input        the requirement text from the user
     * @param currentStage null for fresh tasks; "e2"/"e3"/"critic" for step-mode resume
     * @param e1Result     persisted E1 result JSON (null for first stage)
     * @param e2Result     persisted E2 result JSON (null for first/second stage)
     * @param feedback     user feedback from confirm step (null if none)
     * @return ordered SSE events to emit via the stream endpoint
     */
    List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                          String e1Result, String e2Result, String feedback);
}
