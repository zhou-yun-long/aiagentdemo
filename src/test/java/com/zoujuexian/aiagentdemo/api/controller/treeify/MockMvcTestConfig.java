package com.zoujuexian.aiagentdemo.api.controller.treeify;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Shared test configuration that provides MockMvc for integration tests.
 * In Spring Boot 4, @AutoConfigureMockMvc was removed; MockMvc must be configured manually.
 */
@TestConfiguration
public class MockMvcTestConfig {

    @Bean
    public MockMvc mockMvc(WebApplicationContext webApplicationContext) {
        return MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }
}
