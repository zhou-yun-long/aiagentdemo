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
     * @return ordered SSE events to emit via the stream endpoint
     */
    List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage);
}
