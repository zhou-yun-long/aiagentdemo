package com.zoujuexian.aiagentdemo.api.common;

import java.util.UUID;

/**
 * Unified API response for /api/v1 speccase endpoints.
 */
public class ApiResponse<T> {

    private int code;
    private String message;
    private T data;

    private String requestId;

    public ApiResponse() {
    }

    private ApiResponse(int code, String message, T data, String requestId) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.requestId = requestId;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(ApiErrorCode.OK.getCode(), ApiErrorCode.OK.getDefaultMessage(), data, newRequestId());
    }

    public static <T> ApiResponse<T> error(ApiErrorCode errorCode, String message) {
        String safeMessage = (message == null || message.isBlank()) ? errorCode.getDefaultMessage() : message;
        return new ApiResponse<>(errorCode.getCode(), safeMessage, null, newRequestId());
    }

    private static String newRequestId() {
        return "req-" + UUID.randomUUID();
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
