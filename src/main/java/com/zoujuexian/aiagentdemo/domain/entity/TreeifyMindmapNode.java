package com.zoujuexian.aiagentdemo.domain.entity;

import com.zoujuexian.aiagentdemo.domain.converter.JsonListConverter;
import com.zoujuexian.aiagentdemo.domain.converter.JsonMapConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "treeify_mindmap_node")
public class TreeifyMindmapNode {

    @Id
    @Column(length = 128)
    private String id;

    @Column(nullable = false)
    private Long projectId;

    @Column(length = 128)
    private String parentId;

    @Column(length = 128)
    private String caseId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 32)
    private String kind;

    @Column(length = 8)
    private String priority;

    @Convert(converter = JsonListConverter.class)
    @Column(length = 2000)
    private List<String> tags = new ArrayList<>();

    @Column(length = 32)
    private String status;

    @Column(length = 32)
    private String executionStatus;

    @Column(length = 32)
    private String source;

    private int version;

    @Column(length = 32)
    private String lane;

    private int depth;

    @Column(name = "node_order")
    private int orderIndex;

    @Column(length = 500)
    private String fontFamily;

    private Integer fontSize;

    @Convert(converter = JsonMapConverter.class)
    @Column(length = 2000)
    private Map<String, Object> layout = new LinkedHashMap<>();

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public TreeifyMindmapNode() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }

    public String getCaseId() { return caseId; }
    public void setCaseId(String caseId) { this.caseId = caseId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getExecutionStatus() { return executionStatus; }
    public void setExecutionStatus(String executionStatus) { this.executionStatus = executionStatus; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getLane() { return lane; }
    public void setLane(String lane) { this.lane = lane; }

    public int getDepth() { return depth; }
    public void setDepth(int depth) { this.depth = depth; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

    public String getFontFamily() { return fontFamily; }
    public void setFontFamily(String fontFamily) { this.fontFamily = fontFamily; }

    public Integer getFontSize() { return fontSize; }
    public void setFontSize(Integer fontSize) { this.fontSize = fontSize; }

    public Map<String, Object> getLayout() { return layout; }
    public void setLayout(Map<String, Object> layout) { this.layout = layout; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
