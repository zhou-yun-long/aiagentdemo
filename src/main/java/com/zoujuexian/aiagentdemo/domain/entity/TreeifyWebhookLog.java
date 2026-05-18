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
@Table(name = "treeify_webhook_log")
public class TreeifyWebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tokenId;

    @Column(nullable = false, length = 255)
    private String endpoint;

    @Lob
    private String payload;

    private Integer statusCode;

    @Lob
    private String error;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public TreeifyWebhookLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTokenId() { return tokenId; }
    public void setTokenId(Long tokenId) { this.tokenId = tokenId; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public Integer getStatusCode() { return statusCode; }
    public void setStatusCode(Integer statusCode) { this.statusCode = statusCode; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
