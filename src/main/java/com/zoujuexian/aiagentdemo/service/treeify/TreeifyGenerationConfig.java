package com.zoujuexian.aiagentdemo.service.treeify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Selects which TreeifyGenerationService implementation to use based on
 * the treeify.generation.mode property (mock / ai / auto).
 */
@Configuration
public class TreeifyGenerationConfig {

    private static final Logger log = LoggerFactory.getLogger(TreeifyGenerationConfig.class);

    @Bean
    @Primary
    public TreeifyGenerationService treeifyGenerationService(
            MockGenerationService mockService,
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
            AiTreeifyGenerationService aiService = new AiTreeifyGenerationService(chatClient, mockService, apiKey);
            selected = aiService;
            log.info("Treeify generation: using AI (forced by config), llmAvailable={}", llmAvailable);
        } else {
            // auto mode: use AI if key is set, else mock
            if (llmAvailable) {
                AiTreeifyGenerationService aiService = new AiTreeifyGenerationService(chatClient, mockService, apiKey);
                selected = aiService;
                log.info("Treeify generation: using AI (auto-detected from API key)");
            } else {
                selected = mockService;
                log.info("Treeify generation: using MOCK (auto-detected, no valid API key)");
            }
        }
        return selected;
    }
}
