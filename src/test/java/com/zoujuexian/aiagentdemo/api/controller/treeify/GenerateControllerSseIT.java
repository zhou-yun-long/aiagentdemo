package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerationConfig;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for GenerateController.
 *
 * Tests cover:
 * - Task creation with different taskKind values (cases, points, api_cases)
 * - Task detail retrieval after creation
 * - Generation history listing
 * - 4xx: creating a task for a non-existent project returns 404
 *
 * Note: The SSE streaming endpoint (/generate/{taskId}/stream) is NOT tested here
 * because it calls the real LLM via OrchestrationService, and the test bean override
 * for TreeifyGenerationService does not take effect in Spring Boot 4 with the current
 * bean wiring. The streaming integration is covered by the stage artifact tests.
 */
@SpringBootTest
@Import(MockMvcTestConfig.class)
class GenerateControllerSseIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TreeifyPersistenceService persistence;

    private Long projectId;

    @BeforeEach
    void setUp() {
        var project = persistence.createProject(new ProjectRequest("SSE Test Project", "test"));
        projectId = project.id();
    }

    @Test
    void createTask_taskKindCases_returnsAcceptedWithStreamUrl() throws Exception {
        GenerationConfig config = new GenerationConfig("cases", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test login requirement", null, null, null, List.of(), config);

        mockMvc.perform(post("/api/v1/projects/{projectId}/generate", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.taskId").isNotEmpty())
                .andExpect(jsonPath("$.data.taskKind").value("cases"))
                .andExpect(jsonPath("$.data.status").value("pending"))
                .andExpect(jsonPath("$.data.streamUrl").isNotEmpty());
    }

    @Test
    void createTask_taskKindPoints_returnsAcceptedWithTaskKind() throws Exception {
        GenerationConfig config = new GenerationConfig("points", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test points requirement", null, null, null, List.of(), config);

        mockMvc.perform(post("/api/v1/projects/{projectId}/generate", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.taskKind").value("points"));
    }

    @Test
    void createTask_taskKindApiCases_returnsAcceptedWithTaskKind() throws Exception {
        GenerationConfig config = new GenerationConfig("api_cases", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test api_cases requirement", null, null, null, List.of(), config);

        mockMvc.perform(post("/api/v1/projects/{projectId}/generate", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.taskKind").value("api_cases"));
    }

    @Test
    void getGenerateTask_afterCreation_returnsTaskDetails() throws Exception {
        // Create a task
        GenerationConfig config = new GenerationConfig("cases", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test requirement", null, null, null, List.of(), config);

        String createResponse = mockMvc.perform(post("/api/v1/projects/{projectId}/generate", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn().getResponse().getContentAsString();

        String taskId = objectMapper.readTree(createResponse).path("data").path("taskId").asText();

        // Get task details
        mockMvc.perform(get("/api/v1/generate/{taskId}", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.taskId").value(taskId))
                .andExpect(jsonPath("$.data.taskKind").value("cases"))
                .andExpect(jsonPath("$.data.mode").value("auto"));
    }

    @Test
    void getGenerateHistory_withTasks_returnsList() throws Exception {
        // Create a task first
        GenerationConfig config = new GenerationConfig("cases", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test history", null, null, null, List.of(), config);

        mockMvc.perform(post("/api/v1/projects/{projectId}/generate", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        // Get history
        mockMvc.perform(get("/api/v1/projects/{projectId}/generate/history", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void createTask_nonExistentProject_returns404() throws Exception {
        GenerationConfig config = new GenerationConfig("cases", null, null, "M", null, null, null, null);
        CreateGenerateTaskRequest request = new CreateGenerateTaskRequest(
                "auto", "test requirement", null, null, null, List.of(), config);

        mockMvc.perform(post("/api/v1/projects/{projectId}/generate", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(2001));
    }
}
