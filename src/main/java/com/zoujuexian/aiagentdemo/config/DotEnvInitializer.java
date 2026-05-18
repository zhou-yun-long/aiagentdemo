package com.zoujuexian.aiagentdemo.config;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env file from project root into Spring Environment as a high-priority property source.
 * This allows application.properties to reference ${OPENAI_API_KEY} etc. from .env.
 * If .env is missing, silently skips (CI/CD can use env vars directly).
 */
public class DotEnvInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final Logger log = LoggerFactory.getLogger(DotEnvInitializer.class);

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")
                    .ignoreIfMissing()
                    .load();

            Map<String, Object> envMap = new HashMap<>();
            dotenv.entries().forEach(entry -> envMap.put(entry.getKey(), entry.getValue()));

            if (!envMap.isEmpty()) {
                ConfigurableEnvironment env = applicationContext.getEnvironment();
                env.getPropertySources().addFirst(new MapPropertySource("dotenv", envMap));
                log.info("Loaded {} entries from .env file", envMap.size());
            }
        } catch (DotenvException e) {
            log.debug("No .env file loaded: {}", e.getMessage());
        }
    }
}
