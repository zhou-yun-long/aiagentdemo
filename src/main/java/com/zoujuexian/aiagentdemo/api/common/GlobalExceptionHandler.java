package com.zoujuexian.aiagentdemo.api.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Converts backend failures into the speccase frontend error contract.
 */
@RestControllerAdvice(basePackages = "com.zoujuexian.aiagentdemo.api.controller.treeify")
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        ApiErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException exception) {
        return ResponseEntity
                .status(ApiErrorCode.BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.BAD_REQUEST, exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception) {
        return ResponseEntity
                .status(ApiErrorCode.INTERNAL_ERROR.getHttpStatus())
                .body(ApiResponse.error(ApiErrorCode.INTERNAL_ERROR, exception.getMessage()));
    }
}
