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

@Configuration
public class TreeifyGenerationConfig {

    private static final Logger log = LoggerFactory.getLogger(TreeifyGenerationConfig.class);

    @Bean
    @Primary
    public TreeifyGenerationService treeifyGenerationService(
            SummaryService summaryService,
            KnowledgeService knowledgeService,
            ChatClient chatClient,
            @Value("${spring.ai.openai.api-key:}") String apiKey,
            @Value("${spring.ai.openai.base-url:}") String baseUrl,
            @Value("${spring.ai.openai.chat.options.model:}") String model
    ) {
        log.info("──────── LLM Configuration ────────");
        log.info("  Base URL : {}", baseUrl);
        log.info("  API Key  : {}", maskKey(apiKey));
        log.info("  Model    : {}", model);
        log.info("───────────────────────────────────");

        Map<String, StageAgent> agents = new LinkedHashMap<>();
        agents.put("e1", new AiStageAgents.E1Agent(chatClient));
        agents.put("e2", new AiStageAgents.E2Agent(chatClient));
        agents.put("e3", new AiStageAgents.E3Agent(chatClient));
        agents.put("critic", new AiStageAgents.CriticAgent(chatClient));
        return new OrchestrationService(agents, summaryService, knowledgeService, apiKey);
    }

    private static String maskKey(String key) {
        if (key == null || key.isBlank()) return "(empty)";
        if (key.length() <= 8) return "****";
        return key.substring(0, 4) + "..." + key.substring(key.length() - 4);
    }
}
