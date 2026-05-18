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
    ATTACHMENT_TOO_LARGE(1001, HttpStatus.PAYLOAD_TOO_LARGE, "单文件不能超过 50MB"),
    ATTACHMENT_INVALID_TYPE(1001, HttpStatus.BAD_REQUEST, "附件类型不支持"),
    EXPORT_TEMPLATE_INVALID(4002, HttpStatus.INTERNAL_SERVER_ERROR, "用例 Excel 模板缺失或损坏"),
    EXPORT_PDF_FAILED(4003, HttpStatus.INTERNAL_SERVER_ERROR, "PDF 报告渲染失败"),
    PLAN_INVALID_STATE(1001, HttpStatus.BAD_REQUEST, "测试计划状态非法"),
    DEFECT_INVALID_STATE(1001, HttpStatus.BAD_REQUEST, "缺陷状态不允许该操作"),
    REVIEW_INVALID_STATE(1001, HttpStatus.BAD_REQUEST, "评审状态不允许该操作"),
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
