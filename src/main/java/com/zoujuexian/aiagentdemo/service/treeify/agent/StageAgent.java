package com.zoujuexian.aiagentdemo.service.treeify.agent;

import reactor.core.publisher.Flux;

/**
 * Abstraction for a single generation stage (E1, E2, E3, Critic).
 * Each implementation handles prompt construction, LLM/template call, and response parsing.
 */
public interface StageAgent {

    /** Stage identifier (e1, e2, e3, critic). */
    String stageName();

    /** Execute this stage and return the structured result (synchronous). */
    StageResult execute(StageContext context);

    /**
     * Stream LLM response tokens for this stage.
     * Default implementation falls back to synchronous execute and emits a single chunk.
     * Implementations that support streaming should override this.
     */
    default Flux<String> streamExecute(StageContext context) {
        StageResult result = execute(context);
        return Flux.just(result.content());
    }
}
