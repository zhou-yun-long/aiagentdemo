package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.service.treeify.agent.AiStageAgents;
import com.zoujuexian.aiagentdemo.service.treeify.agent.StageAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Selects which TreeifyGenerationService implementation to use based on
 * the treeify.generation.mode property (mock / ai / auto).
 *
 * When AI mode is active, uses OrchestrationService with composable StageAgents
 * and project summary/RAG context injection.
 */
@Configuration
public class TreeifyGenerationConfig {

    private static final Logger log = LoggerFactory.getLogger(TreeifyGenerationConfig.class);

    @Bean
    @Primary
    public TreeifyGenerationService treeifyGenerationService(
            MockGenerationService mockService,
            SummaryService summaryService,
            KnowledgeService knowledgeService,
            ChatClient chatClient,
            @Value("${spring.ai.openai.api-key:}") String apiKey,
            @Value("${treeify.generation.mode:auto}") String mode
    ) {
        boolean llmAvailable = apiKey != null && !apiKey.isBlank() && !"test".equals(apiKey);

        TreeifyGenerationService selected;
        if ("mock".equals(mode)) {
            selected = mockService;
            log.info("Treeify generation: using MOCK (forced by config)");
        } else if ("ai".equals(mode)) {
            selected = buildOrchestration(chatClient, mockService, summaryService, knowledgeService, apiKey);
            log.info("Treeify generation: using AI (forced by config), llmAvailable={}", llmAvailable);
        } else {
            if (llmAvailable) {
                selected = buildOrchestration(chatClient, mockService, summaryService, knowledgeService, apiKey);
                log.info("Treeify generation: using AI (auto-detected from API key)");
            } else {
                selected = mockService;
                log.info("Treeify generation: using MOCK (auto-detected, no valid API key)");
            }
        }
        return selected;
    }

    private OrchestrationService buildOrchestration(ChatClient chatClient, MockGenerationService mockService,
                                                     SummaryService summaryService, KnowledgeService knowledgeService,
                                                     String apiKey) {
        Map<String, StageAgent> agents = new LinkedHashMap<>();
        agents.put("e1", new AiStageAgents.E1Agent(chatClient));
        agents.put("e2", new AiStageAgents.E2Agent(chatClient));
        agents.put("e3", new AiStageAgents.E3Agent(chatClient, mockService));
        agents.put("critic", new AiStageAgents.CriticAgent(chatClient));
        return new OrchestrationService(agents, mockService, summaryService, knowledgeService, apiKey);
    }
}
