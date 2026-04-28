package com.zoujuexian.aiagentdemo.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "treeify_generation_event")
public class TreeifyGenerationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 36)
    private String taskId;

    @Column(nullable = false, length = 32)
    private String eventName;

    @Column(length = 16)
    private String stage;

    @Column(nullable = false)
    private Long sequence;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String payload;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public TreeifyGenerationEvent() {}

    public TreeifyGenerationEvent(String taskId, String eventName, String stage, Long sequence, String payload) {
        this.taskId = taskId;
        this.eventName = eventName;
        this.stage = stage;
        this.sequence = sequence;
        this.payload = payload;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTaskId() { return taskId; }
    public String getEventName() { return eventName; }
    public String getStage() { return stage; }
    public Long getSequence() { return sequence; }
    public String getPayload() { return payload; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
