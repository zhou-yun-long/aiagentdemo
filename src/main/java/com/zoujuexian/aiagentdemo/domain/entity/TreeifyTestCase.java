package com.zoujuexian.aiagentdemo.domain.entity;

import com.zoujuexian.aiagentdemo.domain.converter.JsonListConverter;
import com.zoujuexian.aiagentdemo.domain.converter.JsonMapConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "treeify_test_case")
public class TreeifyTestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    private Long parentId;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String precondition;

    @Convert(converter = JsonListConverter.class)
    @Column(length = 4000)
    private List<String> steps = new ArrayList<>();

    @Column(length = 2000)
    private String expected;

    @Column(length = 8)
    private String priority;

    @Convert(converter = JsonListConverter.class)
    @Column(length = 2000)
    private List<String> tags = new ArrayList<>();

    @Column(length = 32)
    private String source;

    @Column(length = 32)
    private String executionStatus;

    @Convert(converter = JsonMapConverter.class)
    @Column(length = 2000)
    private Map<String, Object> layout = new LinkedHashMap<>();

    private int version;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public TreeifyTestCase() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPrecondition() { return precondition; }
    public void setPrecondition(String precondition) { this.precondition = precondition; }

    public List<String> getSteps() { return steps; }
    public void setSteps(List<String> steps) { this.steps = steps; }

    public String getExpected() { return expected; }
    public void setExpected(String expected) { this.expected = expected; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getExecutionStatus() { return executionStatus; }
    public void setExecutionStatus(String executionStatus) { this.executionStatus = executionStatus; }

    public Map<String, Object> getLayout() { return layout; }
    public void setLayout(Map<String, Object> layout) { this.layout = layout; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
