package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.plan.CreateTestPlanRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(MockMvcTestConfig.class)
class ReportControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TreeifyPersistenceService persistence;

    private Long projectId;
    private Long planId;

    @BeforeEach
    void setUp() throws Exception {
        var project = persistence.createProject(new ProjectRequest("Report Test Project", "test"));
        projectId = project.id();

        var testCase = persistence.createCase(projectId, new TestCaseRequest(
                null,
                "Report Test Case",
                "precondition",
                List.of("step1"),
                "expected",
                "P0",
                List.of("Web"),
                "manual",
                "not_run",
                Map.of("collapsed", false),
                null
        ));

        // Create a plan for report creation
        CreateTestPlanRequest planRequest = new CreateTestPlanRequest(
                projectId, "Report Plan", "desc", List.of(testCase.id()));

        String planResponse = mockMvc.perform(post("/api/v1/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(planRequest)))
                .andReturn().getResponse().getContentAsString();

        planId = objectMapper.readTree(planResponse).path("data").path("id").asLong();
    }

    @Test
    void createReport_andGetReportDetail_happyPath() throws Exception {
        // Create report from plan
        String response = mockMvc.perform(post("/api/v1/plans/{planId}/reports", planId)
                        .param("projectId", String.valueOf(projectId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.planId").value(planId))
                .andExpect(jsonPath("$.data.projectId").value(projectId))
                .andExpect(jsonPath("$.data.name").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        Long reportId = objectMapper.readTree(response).path("data").path("id").asLong();

        // Get report detail
        mockMvc.perform(get("/api/v1/reports/{reportId}", reportId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.id").value(reportId))
                .andExpect(jsonPath("$.data.planId").value(planId));
    }

    @Test
    void getReport_nonExistentReport_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/reports/{reportId}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(2001))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("测试报告不存在")));
    }
}
