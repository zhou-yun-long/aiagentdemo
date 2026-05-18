package com.zoujuexian.aiagentdemo.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "treeify_defect")
public class TreeifyDefect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 500)
    private String title;

    @Lob
    private String description;

    @Column(nullable = false, length = 16)
    private String severity;

    @Column(nullable = false, length = 32)
    private String status;

    private Long caseId;

    private Long planId;

    @Column(length = 128)
    private String reporter;

    @Column(length = 128)
    private String assignee;

    @Lob
    private String resolution;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public TreeifyDefect() {}

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.severity == null || this.severity.isBlank()) {
            this.severity = "medium";
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "open";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public String getReporter() { return reporter; }
    public void setReporter(String reporter) { this.reporter = reporter; }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }

    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
