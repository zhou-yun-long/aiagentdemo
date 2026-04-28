package com.zoujuexian.aiagentdemo.service.treeify.agent;

/**
 * Abstraction for a single generation stage (E1, E2, E3, Critic).
 * Each implementation handles prompt construction, LLM/template call, and response parsing.
 */
public interface StageAgent {

    /** Stage identifier (e1, e2, e3, critic). */
    String stageName();

    /** Execute this stage and return the structured result. */
    StageResult execute(StageContext context);
}
