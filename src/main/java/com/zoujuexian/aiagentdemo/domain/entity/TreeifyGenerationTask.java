package com.zoujuexian.aiagentdemo.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "treeify_generation_task")
public class TreeifyGenerationTask {

    @Id
    @Column(length = 36)
    private String taskId;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 16)
    private String mode;

    @Lob
    @Column
    private String inputText;

    @Column(length = 128)
    private String selectedNodeId;

    @Column(length = 2000)
    private String contextCaseIds;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(length = 32)
    private String currentStage;

    @Column(length = 128)
    private String streamUrl;

    private Integer criticScore;

    @Column(length = 4000)
    private String e1Result;

    @Column(length = 4000)
    private String e2Result;

    @Column(length = 2000)
    private String feedback;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime completedAt;

    public TreeifyGenerationTask() {}

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getInputText() { return inputText; }
    public void setInputText(String inputText) { this.inputText = inputText; }

    public String getSelectedNodeId() { return selectedNodeId; }
    public void setSelectedNodeId(String selectedNodeId) { this.selectedNodeId = selectedNodeId; }

    public String getContextCaseIds() { return contextCaseIds; }
    public void setContextCaseIds(String contextCaseIds) { this.contextCaseIds = contextCaseIds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrentStage() { return currentStage; }
    public void setCurrentStage(String currentStage) { this.currentStage = currentStage; }

    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }

    public Integer getCriticScore() { return criticScore; }
    public void setCriticScore(Integer criticScore) { this.criticScore = criticScore; }

    public String getE1Result() { return e1Result; }
    public void setE1Result(String e1Result) { this.e1Result = e1Result; }

    public String getE2Result() { return e2Result; }
    public void setE2Result(String e2Result) { this.e2Result = e2Result; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
