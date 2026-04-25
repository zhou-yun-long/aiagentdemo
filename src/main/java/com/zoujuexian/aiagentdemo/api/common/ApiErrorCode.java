package com.zoujuexian.aiagentdemo.api.common;

import org.springframework.http.HttpStatus;

/**
 * Error codes shared by speccase REST APIs and the frontend client.
 */
public enum ApiErrorCode {

    OK(0, HttpStatus.OK, "ok"),
    BAD_REQUEST(1001, HttpStatus.BAD_REQUEST, "请求参数缺失或格式错误"),
    UNAUTHORIZED(1002, HttpStatus.UNAUTHORIZED, "未登录或 token 过期"),
    FORBIDDEN(1003, HttpStatus.FORBIDDEN, "无权限访问该资源"),
    NOT_FOUND(2001, HttpStatus.NOT_FOUND, "资源不存在"),
    SUMMARY_UPDATING(2002, HttpStatus.CONFLICT, "项目摘要更新中，请稍后"),
    LLM_FAILED(3001, HttpStatus.UNPROCESSABLE_ENTITY, "LLM 调用失败"),
    CRITIC_RETRY_EXCEEDED(3002, HttpStatus.UNPROCESSABLE_ENTITY, "Critic 重试次数超限"),
    GENERATION_TIMEOUT(3003, HttpStatus.REQUEST_TIMEOUT, "生成任务超时"),
    VECTORIZATION_FAILED(4001, HttpStatus.INTERNAL_SERVER_ERROR, "向量化入库失败"),
    INTERNAL_ERROR(5000, HttpStatus.INTERNAL_SERVER_ERROR, "服务器内部错误");

    private final int code;
    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ApiErrorCode(int code, HttpStatus httpStatus, String defaultMessage) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
