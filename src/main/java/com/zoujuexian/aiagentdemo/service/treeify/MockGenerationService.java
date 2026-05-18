package com.zoujuexian.aiagentdemo.service.treeify;

import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.GENERATION_COMPLETE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_CHUNK;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_DONE;
import static com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName.STAGE_STARTED;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Mock generation implementation.
 * Produces pre-canned SSE event sequences for demo and fallback.
 */
@Service
public class MockGenerationService implements TreeifyGenerationService {

    @Override
    public List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input, String currentStage,
                                                  String e1Result, String e2Result, String feedback, Long projectId) {
        MockScenario scenario = resolveScenario(input);
        if (!"step".equals(mode)) {
            return buildAutoGenerateEvents(taskId, scenario);
        }
        String stage = currentStage != null ? currentStage : "e1";
        return switch (stage) {
            case "e2" -> buildE2Events(taskId, scenario, true);
            case "e3", "critic" -> buildFinalEvents(taskId, scenario);
            default -> buildE1Events(taskId, scenario, true);
        };
    }

    // ──── Event builders ────

    private List<GenerateSseEventDto> buildAutoGenerateEvents(String taskId, MockScenario scenario) {
        List<GenerateSseEventDto> events = new ArrayList<>();
        events.addAll(buildE1Events(taskId, scenario, false));
        events.addAll(buildE2Events(taskId, scenario, false));
        events.addAll(buildFinalEvents(taskId, scenario));
        return events;
    }

    private List<GenerateSseEventDto> buildE1Events(String taskId, MockScenario scenario, boolean needConfirm) {
        return List.of(
                event(taskId, STAGE_STARTED, "e1", 1, Map.of("stage", "e1")),
                event(taskId, STAGE_CHUNK, "e1", 2, Map.of("content", scenario.e1Chunk())),
                event(taskId, STAGE_DONE, "e1", 3, Map.of(
                        "needConfirm", needConfirm,
                        "result", scenario.e1Result()
                ))
        );
    }

    private List<GenerateSseEventDto> buildE2Events(String taskId, MockScenario scenario, boolean needConfirm) {
        return List.of(
                event(taskId, STAGE_STARTED, "e2", 4, Map.of("stage", "e2")),
                event(taskId, STAGE_CHUNK, "e2", 5, Map.of("content", scenario.e2Chunk())),
                event(taskId, STAGE_DONE, "e2", 6, Map.of(
                        "needConfirm", needConfirm,
                        "result", scenario.e2Result()
                ))
        );
    }

    private List<GenerateSseEventDto> buildFinalEvents(String taskId, MockScenario scenario) {
        List<GeneratedCaseDto> generatedCases = scenario.cases();
        return List.of(
                event(taskId, STAGE_STARTED, "e3", 7, Map.of("stage", "e3")),
                event(taskId, STAGE_CHUNK, "e3", 8, Map.of("content", scenario.e3Chunk())),
                event(taskId, STAGE_DONE, "e3", 9, Map.of("needConfirm", false, "result", generatedCases)),
                event(taskId, STAGE_STARTED, "critic", 10, Map.of("stage", "critic")),
                event(taskId, STAGE_DONE, "critic", 11, Map.of(
                        "needConfirm", false,
                        "result", new CriticReportDto(88, List.of("覆盖了 happy/error 路径", "后续可补充密码边界长度用例"), 0)
                )),
                event(taskId, GENERATION_COMPLETE, null, 12, Map.of("criticScore", 88, "cases", generatedCases))
        );
    }

    // ──── Scenario resolution ────

    private MockScenario resolveScenario(String input) {
        String text = input != null ? input : "";
        if (text.contains("红包") || text.contains("提现") || text.contains("tag")) {
            return redPacketScenario();
        }
        return loginScenario();
    }

    private MockScenario loginScenario() {
        return new MockScenario(
                "正在解析登录需求目标、用户动作和系统约束...",
                Map.of(
                        "businessGoals", List.of("提升登录链路质量", "覆盖正常、异常和边界路径"),
                        "userActions", List.of("输入账号密码", "提交登录"),
                        "systemBehaviors", List.of("校验账号密码", "返回登录结果"),
                        "constraints", List.of("密码长度 6-20 位", "错误信息需要明确"),
                        "requirements", List.of(
                                Map.of("requirementId", "req-login-main", "title", "手机号登录主流程", "summary", "用户输入合法手机号和正确密码后完成登录并跳转首页", "type", "flow"),
                                Map.of("requirementId", "req-login-validation", "title", "输入校验", "summary", "手机号必须为 11 位，密码长度必须为 6-20 位", "type", "rule"),
                                Map.of("requirementId", "req-login-lock", "title", "失败锁定", "summary", "连续失败 5 次后账号临时锁定并提示原因", "type", "risk")
                        )
                ),
                "正在拆分可测试对象：登录表单、账号校验、错误提示、跳转流程...",
                List.of(
                        Map.of("name", "登录表单", "objectId", "obj-login-form", "type", "ui", "dimensions", List.of("输入校验", "提交交互"), "priority", "P0", "requirementIds", List.of("req-login-validation")),
                        Map.of("name", "账号密码校验", "objectId", "obj-login-credential", "type", "function", "dimensions", List.of("正常路径", "异常路径"), "priority", "P0", "requirementIds", List.of("req-login-main")),
                        Map.of("name", "登录后跳转", "objectId", "obj-login-redirect", "type", "flow", "dimensions", List.of("成功跳转", "失败停留"), "priority", "P1", "requirementIds", List.of("req-login-main"))
                ),
                "正在生成登录链路测试用例，并补齐前置条件、步骤和预期结果...",
                loginGeneratedCases()
        );
    }

    private MockScenario redPacketScenario() {
        return new MockScenario(
                "正在解析策略红包展示、领取入口、库存提示和提现后状态更新规则...",
                Map.of(
                        "businessGoals", List.of("保障策略红包展示与领取流程正确", "覆盖库存不足、状态更新和页面跳转"),
                        "userActions", List.of("查看策略红包 tag", "点击策略红包", "进入提现详情页", "完成提现后回到活动主页"),
                        "systemBehaviors", List.of("按红包类型展示 tag", "根据库存返回领取结果", "提现完成后更新红包展示状态"),
                        "constraints", List.of("新人红包、加油红包需要区分展示", "库存不足时提示该红包已被抢光", "提现完成后活动主页状态同步"),
                        "requirements", List.of(
                                Map.of("requirementId", "req-red-packet-display", "title", "策略红包展示", "summary", "活动主页按类型展示策略红包 tag 并区分新人红包和加油红包", "type", "flow"),
                                Map.of("requirementId", "req-red-packet-navigation", "title", "策略红包点击跳转", "summary", "点击策略红包进入提现详情页并展示选中态", "type", "flow"),
                                Map.of("requirementId", "req-red-packet-stock", "title", "库存校验", "summary", "库存不足时提示已被抢光并阻止领取", "type", "rule"),
                                Map.of("requirementId", "req-red-packet-status", "title", "提现状态同步", "summary", "提现完成后活动主页同步更新红包状态", "type", "data")
                        )
                ),
                "正在拆分可测试对象：策略红包 tag、提现详情入口、库存校验、提现完成状态同步...",
                List.of(
                        Map.of("name", "策略红包 tag 展示", "objectId", "obj-red-packet-tag", "type", "ui", "dimensions", List.of("新人红包", "加油红包", "余额展示"), "priority", "P0", "requirementIds", List.of("req-red-packet-display")),
                        Map.of("name", "策略红包点击跳转", "objectId", "obj-red-packet-navigation", "type", "flow", "dimensions", List.of("进入提现详情页", "选中态展示"), "priority", "P0", "requirementIds", List.of("req-red-packet-navigation")),
                        Map.of("name", "策略红包库存校验", "objectId", "obj-red-packet-stock", "type", "function", "dimensions", List.of("仍有余额", "库存不足提示"), "priority", "P0", "requirementIds", List.of("req-red-packet-stock")),
                        Map.of("name", "提现完成状态同步", "objectId", "obj-red-packet-status", "type", "data", "dimensions", List.of("活动主页刷新", "红包状态更新"), "priority", "P1", "requirementIds", List.of("req-red-packet-status"))
                ),
                "正在生成策略红包测试用例，覆盖 tag 展示、点击流程、库存不足和提现完成后的状态更新...",
                redPacketGeneratedCases()
        );
    }

    // ──── Public fallback cases (used by AiTreeifyGenerationService) ────

    public List<GeneratedCaseDto> defaultCases() {
        return loginGeneratedCases();
    }

    // ──── Generated case factories ────

    private List<GeneratedCaseDto> loginGeneratedCases() {
        return List.of(
                new GeneratedCaseDto(
                        "正确账号密码登录成功",
                        "用户已注册合法账号，系统处于正常运行状态",
                        List.of("打开登录页面", "输入正确的用户名和密码", "点击登录按钮"),
                        "登录成功并跳转首页",
                        "P0",
                        List.of("Web", "AI"),
                        "ai",
                        "happy",
                        "case-login-success",
                        List.of("obj-login-credential"),
                        List.of("req-login-main"),
                        null,
                        null,
                        null
                ),
                new GeneratedCaseDto(
                        "错误密码登录失败",
                        "用户已注册合法账号，系统处于正常运行状态",
                        List.of("打开登录页面", "输入正确用户名和错误密码", "点击登录按钮"),
                        "页面提示用户名或密码错误",
                        "P1",
                        List.of("Web", "AI"),
                        "ai",
                        "error",
                        "case-login-wrong-password",
                        List.of("obj-login-credential", "obj-login-error"),
                        List.of("req-login-main", "req-login-validation"),
                        null,
                        null,
                        null
                ),
                new GeneratedCaseDto(
                        "空账号提交登录失败",
                        "系统处于正常运行状态",
                        List.of("打开登录页面", "用户名留空并输入密码", "点击登录按钮"),
                        "页面提示请输入账号",
                        "P1",
                        List.of("Web", "AI"),
                        "ai",
                        "boundary",
                        "case-login-empty-account",
                        List.of("obj-login-form", "obj-login-error"),
                        List.of("req-login-validation"),
                        null,
                        null,
                        null
                )
        );
    }

    private List<GeneratedCaseDto> redPacketGeneratedCases() {
        return List.of(
                new GeneratedCaseDto(
                        "策略红包仍有余额时展示对应 tag",
                        "用户进入活动主页，策略红包配置已开启且红包仍有余额",
                        List.of("打开活动主页", "查看策略红包区域", "分别检查新人红包和加油红包 tag"),
                        "页面展示策略红包入口，并正确区分新人红包、加油红包 tag",
                        "P0",
                        List.of("Web", "AI", "策略红包"),
                        "ai",
                        "happy",
                        "case-red-packet-tag",
                        List.of("obj-red-packet-tag"),
                        List.of("req-red-packet-display"),
                        null,
                        null,
                        null
                ),
                new GeneratedCaseDto(
                        "点击策略红包进入提现详情页",
                        "策略红包在活动主页正常展示，用户具备提现资格",
                        List.of("打开活动主页", "点击新人红包或加油红包 tag", "观察页面跳转和选中状态"),
                        "系统进入提现详情页，当前策略红包被选中并展示对应提现信息",
                        "P0",
                        List.of("Web", "AI", "提现"),
                        "ai",
                        "happy",
                        "case-red-packet-detail",
                        List.of("obj-red-packet-navigation"),
                        List.of("req-red-packet-navigation"),
                        null,
                        null,
                        null
                ),
                new GeneratedCaseDto(
                        "策略红包库存不足时提示已被抢光",
                        "策略红包入口仍可见，但后端返回红包库存不足",
                        List.of("打开活动主页", "点击策略红包进入提现详情页", "点击提现或领取按钮"),
                        "流程提示该红包已被抢光，用户无法继续领取该策略红包",
                        "P0",
                        List.of("Web", "AI", "库存校验"),
                        "ai",
                        "error",
                        "case-red-packet-stock-empty",
                        List.of("obj-red-packet-stock"),
                        List.of("req-red-packet-stock"),
                        null,
                        null,
                        null
                ),
                new GeneratedCaseDto(
                        "提现完成后活动主页状态更新",
                        "用户已成功进入提现详情页并完成策略红包提现",
                        List.of("完成提现流程", "返回活动主页", "刷新或重新进入活动主页"),
                        "活动主页同步最新状态，不再展示已完成提现的策略红包或展示已领取状态",
                        "P1",
                        List.of("Web", "AI", "状态同步"),
                        "ai",
                        "alternative",
                        "case-red-packet-status-sync",
                        List.of("obj-red-packet-status"),
                        List.of("req-red-packet-status"),
                        null,
                        null,
                        null
                )
        );
    }

    // ──── Helper ────

    private GenerateSseEventDto event(String taskId, GenerateSseEventName type, String stage, long sequence, Object payload) {
        return new GenerateSseEventDto(type, taskId, stage, sequence, LocalDateTime.now(), payload);
    }

    record MockScenario(
            String e1Chunk,
            Object e1Result,
            String e2Chunk,
            Object e2Result,
            String e3Chunk,
            List<GeneratedCaseDto> cases
    ) {}
}
