package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(MockMvcTestConfig.class)
class DashboardControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TreeifyPersistenceService persistence;

    private Long projectId;

    @BeforeEach
    void setUp() {
        // Create a fresh project for each test to avoid dependency on seed data
        var project = persistence.createProject(new ProjectRequest("Dashboard Test Project", "test"));
        projectId = project.id();
    }

    @Test
    void getDashboard_validProject_returnsDashboardData() throws Exception {
        mockMvc.perform(get("/api/v1/projects/{projectId}/dashboard", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalCases").isNumber())
                .andExpect(jsonPath("$.data.passRate").isNumber())
                .andExpect(jsonPath("$.data.recentActivity").isArray());
    }

    @Test
    void getDashboard_nonExistentProject_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/projects/{projectId}/dashboard", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(2001))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("项目不存在")));
    }
}
