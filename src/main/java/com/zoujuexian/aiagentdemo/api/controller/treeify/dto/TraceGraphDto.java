package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.List;

public class TraceGraphDto {

    private Long projectId;
    private String taskId;
    private List<TraceNodeDto> nodes;
    private List<TraceEdgeDto> edges;
    private String updatedAt;

    public TraceGraphDto() {}

    public TraceGraphDto(Long projectId, String taskId, List<TraceNodeDto> nodes,
                         List<TraceEdgeDto> edges, String updatedAt) {
        this.projectId = projectId;
        this.taskId = taskId;
        this.nodes = nodes;
        this.edges = edges;
        this.updatedAt = updatedAt;
    }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public List<TraceNodeDto> getNodes() { return nodes; }
    public void setNodes(List<TraceNodeDto> nodes) { this.nodes = nodes; }

    public List<TraceEdgeDto> getEdges() { return edges; }
    public void setEdges(List<TraceEdgeDto> edges) { this.edges = edges; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
