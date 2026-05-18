package com.zoujuexian.aiagentdemo.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "treeify_attachment")
public class TreeifyAttachment {

    @Id
    @Column(name = "attachment_id", length = 40)
    private String attachmentId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 128)
    private String contentType;

    @Column(nullable = false)
    private Long size;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(nullable = false, length = 32)
    private String purpose;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public TreeifyAttachment() {}

    public String getAttachmentId() { return attachmentId; }
    public void setAttachmentId(String attachmentId) { this.attachmentId = attachmentId; }

    // Alias for Spring Data query derivation (OrderByIdDesc expects getId())
    public String getId() { return attachmentId; }
    public void setId(String id) { this.attachmentId = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
