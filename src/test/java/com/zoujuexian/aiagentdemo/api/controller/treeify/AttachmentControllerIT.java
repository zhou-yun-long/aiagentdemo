package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(MockMvcTestConfig.class)
class AttachmentControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TreeifyPersistenceService persistence;

    private Long projectId;

    @BeforeEach
    void setUp() {
        var project = persistence.createProject(new ProjectRequest("Attachment Test Project", "test"));
        projectId = project.id();
    }

    @Test
    void upload_validFile_returnsAttachmentId() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "requirement.md",
                "text/markdown",
                "# Test Requirement\nSome content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/projects/{projectId}/attachments", projectId)
                        .file(file)
                        .param("purpose", "requirement"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.attachmentId").isNotEmpty())
                .andExpect(jsonPath("$.data.fileName").value("requirement.md"))
                .andExpect(jsonPath("$.data.contentType").value("text/markdown"))
                .andExpect(jsonPath("$.data.purpose").value("requirement"));
    }

    @Test
    void upload_invalidFileType_returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malware.exe",
                "application/octet-stream",
                "MZ fake executable".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/projects/{projectId}/attachments", projectId)
                        .file(file)
                        .param("purpose", "requirement"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1001))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("不支持的文件类型")));
    }
}
