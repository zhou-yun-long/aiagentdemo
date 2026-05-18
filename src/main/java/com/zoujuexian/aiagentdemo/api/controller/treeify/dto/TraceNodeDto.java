package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

import java.util.Map;

public class TraceNodeDto {

    private String id;
    private String kind;
    private String title;
    private String summary;
    private String priority;
    private Long caseId;
    private String draftCaseId;
    private Map<String, Object> raw;

    public TraceNodeDto() {}

    public TraceNodeDto(String id, String kind, String title, String summary,
                        String priority, Long caseId, String draftCaseId, Map<String, Object> raw) {
        this.id = id;
        this.kind = kind;
        this.title = title;
        this.summary = summary;
        this.priority = priority;
        this.caseId = caseId;
        this.draftCaseId = draftCaseId;
        this.raw = raw;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public String getDraftCaseId() { return draftCaseId; }
    public void setDraftCaseId(String draftCaseId) { this.draftCaseId = draftCaseId; }

    public Map<String, Object> getRaw() { return raw; }
    public void setRaw(Map<String, Object> raw) { this.raw = raw; }
}
