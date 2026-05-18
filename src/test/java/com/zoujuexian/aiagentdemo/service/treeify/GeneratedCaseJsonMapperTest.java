package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeneratedCaseJsonMapperTest {

    @Test
    void parsesChineseExpectedField() {
        String response = """
                [
                  {
                    "用例标题": "错误密码登录失败",
                    "前置条件": "用户已注册",
                    "执行步骤": ["打开登录页", "输入错误密码", "点击登录"],
                    "预期结果": "页面提示用户名或密码错误",
                    "优先级": "P1"
                  }
                ]
                """;

        List<GeneratedCaseDto> cases = GeneratedCaseJsonMapper.parseCases(response, List.of());

        assertEquals("页面提示用户名或密码错误", cases.get(0).expected());
    }

    @Test
    void parsesExpectedResultAliasFromWrappedCases() {
        String response = """
                {
                  "cases": [
                    {
                      "title": "正确账号密码登录成功",
                      "precondition": "用户已注册",
                      "steps": ["打开登录页", "输入正确账号密码", "点击登录"],
                      "expectedResult": "登录成功并跳转首页",
                      "priority": "P0"
                    }
                  ]
                }
                """;

        List<GeneratedCaseDto> cases = GeneratedCaseJsonMapper.parseCases(response, List.of());

        assertEquals("登录成功并跳转首页", cases.get(0).expected());
    }

    @Test
    void preservesTraceabilityIdsFromCommonAliases() {
        String response = """
                [
                  {
                    "title": "正确手机号密码登录成功",
                    "precondition": "用户已注册",
                    "steps": ["打开登录页", "输入正确账号密码", "点击登录"],
                    "expected": "登录成功并跳转首页",
                    "priority": "p0",
                    "objectId": "obj-login-credential",
                    "requirementId": "req-login-main"
                  }
                ]
                """;

        List<GeneratedCaseDto> cases = GeneratedCaseJsonMapper.parseCases(response, List.of());

        assertEquals("P0", cases.get(0).priority());
        assertTrue(cases.get(0).draftCaseId().startsWith("case-"));
        assertEquals(List.of("obj-login-credential"), cases.get(0).objectIds());
        assertEquals(List.of("req-login-main"), cases.get(0).requirementIds());
    }
}
