package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.CreateTestPlanRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.UpdatePlanCaseResultRequest;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(MockMvcTestConfig.class)
class PlanControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TreeifyPersistenceService persistence;

    private Long projectId;
    private Long caseId;

    @BeforeEach
    void setUp() {
        var project = persistence.createProject(new ProjectRequest("Plan Test Project", "test"));
        projectId = project.id();

        var testCase = persistence.createCase(projectId, new TestCaseRequest(
                null,
                "Test Case for Plan",
                "precondition",
                List.of("step1"),
                "expected result",
                "P0",
                List.of("Web"),
                "manual",
                "not_run",
                Map.of("collapsed", false),
                null
        ));
        caseId = testCase.id();
    }

    @Test
    void createPlan_andGetPlan_happyPath() throws Exception {
        // Create plan
        CreateTestPlanRequest request = new CreateTestPlanRequest(
                projectId, "Sprint 1 Plan", "Sprint 1 regression", List.of(caseId));

        String response = mockMvc.perform(post("/api/v1/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.name").value("Sprint 1 Plan"))
                .andExpect(jsonPath("$.data.status").value("draft"))
                .andExpect(jsonPath("$.data.projectId").value(projectId))
                .andReturn().getResponse().getContentAsString();

        // Extract plan ID from response
        Long planId = objectMapper.readTree(response).path("data").path("id").asLong();

        // Get plan detail
        mockMvc.perform(get("/api/v1/plans/{planId}", planId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.plan.name").value("Sprint 1 Plan"))
                .andExpect(jsonPath("$.data.cases").isArray());
    }

    @Test
    void updateCaseResult_invalidExecutionResult_returns4xx() throws Exception {
        // Create plan with case
        CreateTestPlanRequest planRequest = new CreateTestPlanRequest(
                projectId, "Plan for Update", "desc", List.of(caseId));

        String response = mockMvc.perform(post("/api/v1/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(planRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long planId = objectMapper.readTree(response).path("data").path("id").asLong();

        // Try to update with invalid execution result
        UpdatePlanCaseResultRequest invalidRequest = new UpdatePlanCaseResultRequest("invalid_status", "note");

        mockMvc.perform(put("/api/v1/plans/{planId}/cases/{caseId}/result", planId, caseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1001))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("pass/fail/blocked/skipped")));
    }
}
