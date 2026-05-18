package com.zoujuexian.aiagentdemo.api.common;

import com.lowagie.text.DocumentException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.io.IOException;

/**
 * Converts backend failures into the speccase frontend error contract.
 */
@RestControllerAdvice(basePackages = "com.zoujuexian.aiagentdemo.api.controller.treeify")
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadTooLarge(MaxUploadSizeExceededException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.ATTACHMENT_TOO_LARGE.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.ATTACHMENT_TOO_LARGE, "单文件不能超过 50MB"));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiResponse<Void>> handleMultipartException(MultipartException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.ATTACHMENT_INVALID_TYPE.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.ATTACHMENT_INVALID_TYPE, "附件类型不支持"));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null; // SSE stream already started, cannot write error response
        }
        ApiErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, exception.getMessage()));
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<ApiResponse<Void>> handleIOException(IOException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.EXPORT_TEMPLATE_INVALID.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.EXPORT_TEMPLATE_INVALID, exception.getMessage()));
    }

    @ExceptionHandler(DocumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleDocumentException(DocumentException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.EXPORT_PDF_FAILED.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.EXPORT_PDF_FAILED, exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.BAD_REQUEST, exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            return null;
        }
        return ResponseEntity
                .status(ApiErrorCode.INTERNAL_ERROR.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.INTERNAL_ERROR, exception.getMessage()));
    }
}
