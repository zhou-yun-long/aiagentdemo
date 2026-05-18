package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

public class TraceEdgeDto {

    private String id;
    private String fromId;
    private String toId;
    private String relation;

    public TraceEdgeDto() {}

    public TraceEdgeDto(String id, String fromId, String toId, String relation) {
        this.id = id;
        this.fromId = fromId;
        this.toId = toId;
        this.relation = relation;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFromId() { return fromId; }
    public void setFromId(String fromId) { this.fromId = fromId; }

    public String getToId() { return toId; }
    public void setToId(String toId) { this.toId = toId; }

    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }
}
