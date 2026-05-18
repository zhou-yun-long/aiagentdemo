package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.AttachmentDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AttachmentService {

    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50MB

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".md", ".docx", ".pdf", ".txt", ".xlsx", ".csv", ".json"
    );

    private final Path attachmentsDir;

    /** In-memory metadata store (replaced by JPA after Flyway V2 migration). */
    private final Map<String, AttachmentDto> metadata = new ConcurrentHashMap<>();

    public AttachmentService(@Value("${testing-platform.attachments.dir}") String attachmentsDir) {
        this.attachmentsDir = Path.of(attachmentsDir);
    }

    public AttachmentDto upload(Long projectId, MultipartFile file, String purpose) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new BusinessException(ApiErrorCode.ATTACHMENT_INVALID_TYPE, "文件名不能为空");
        }

        // Reject path traversal
        if (originalFilename.contains("..") || originalFilename.startsWith("/")) {
            throw new BusinessException(ApiErrorCode.ATTACHMENT_INVALID_TYPE, "文件名包含非法字符");
        }

        String ext = extractExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new BusinessException(ApiErrorCode.ATTACHMENT_INVALID_TYPE,
                    "不支持的文件类型: " + ext + "，允许: " + ALLOWED_EXTENSIONS);
        }

        String attachmentId = UUID.randomUUID().toString();
        String storedFilename = attachmentId + ext;
        Path projectDir = attachmentsDir.resolve(String.valueOf(projectId));

        try {
            Files.createDirectories(projectDir);
            Path target = projectDir.resolve(storedFilename);
            file.transferTo(target.toFile());
        } catch (IOException e) {
            throw new BusinessException(ApiErrorCode.INTERNAL_ERROR, "文件保存失败: " + e.getMessage());
        }

        AttachmentDto dto = new AttachmentDto(
                attachmentId,
                originalFilename,
                file.getContentType(),
                file.getSize(),
                purpose == null || purpose.isBlank() ? "requirement" : purpose,
                LocalDateTime.now()
        );

        metadata.put(attachmentId, dto);
        return dto;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "上传文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ApiErrorCode.ATTACHMENT_TOO_LARGE, "单文件不能超过 50MB");
        }
    }

    private String extractExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex);
    }
}
