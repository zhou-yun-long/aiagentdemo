package com.zoujuexian.aiagentdemo.service.treeify;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.service.treeify.agent.JsonOutputParser;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Normalizes LLM test-case JSON into the public GeneratedCaseDto contract.
 */
public final class GeneratedCaseJsonMapper {

    private GeneratedCaseJsonMapper() {}

    public static List<GeneratedCaseDto> parseCases(String response, List<GeneratedCaseDto> fallbackCases) {
        if (response == null || response.isBlank()) {
            return fallbackCases;
        }
        JSONArray arr = JsonOutputParser.parseArray(response);
        if (arr == null || arr.isEmpty()) {
            return fallbackCases;
        }
        arr = unwrapCaseArray(arr);

        List<GeneratedCaseDto> cases = new ArrayList<>();
        for (int i = 0; i < arr.size(); i++) {
            JSONObject obj = toObject(arr.get(i));
            if (obj == null) {
                continue;
            }
            cases.add(fromObject(obj));
        }
        return cases.isEmpty() ? fallbackCases : cases;
    }

    public static GeneratedCaseDto fromObject(JSONObject obj) {
        String title = firstText(obj, "title", "name", "caseTitle", "用例标题", "标题", "测试用例");
        if (isBlank(title)) {
            title = "未命名测试用例";
        }

        List<String> steps = firstStringList(obj, "steps", "step", "actions", "testSteps", "执行步骤", "操作步骤", "步骤");
        String expected = firstText(obj,
                "expected", "expectedResult", "expectResult", "expected_result", "expectation",
                "result", "预期结果", "期望结果", "预期", "期望");
        if (isBlank(expected)) {
            expected = inferExpectedFromSteps(steps);
        }
        if (isBlank(expected)) {
            expected = "系统应完成「" + title + "」对应流程，并展示正确结果";
        }

        return new GeneratedCaseDto(
                title,
                firstText(obj, "precondition", "preconditions", "condition", "前置条件", "前提条件", "前置"),
                steps,
                expected,
                normalizePriority(firstText(obj, "priority", "优先级")),
                firstStringList(obj, "tags", "tag", "labels", "标签"),
                defaultText(firstText(obj, "source", "来源"), "ai"),
                defaultText(firstText(obj, "pathType", "path_type", "type", "路径类型"), "happy")
        );
    }

    private static JSONObject toObject(Object value) {
        if (value instanceof JSONObject obj) {
            return obj;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return JSON.parseObject(text);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private static String firstText(JSONObject obj, String... keys) {
        for (String key : keys) {
            Object value = obj.get(key);
            String text = stringifyScalar(value);
            if (!isBlank(text)) {
                return text.trim();
            }
        }
        return "";
    }

    private static List<String> firstStringList(JSONObject obj, String... keys) {
        for (String key : keys) {
            Object value = obj.get(key);
            List<String> values = toStringList(value);
            if (!values.isEmpty()) {
                return values;
            }
        }
        return List.of();
    }

    private static List<String> toStringList(Object value) {
        if (value == null) {
            return List.of();
        }
        if (value instanceof JSONArray arr) {
            List<String> result = new ArrayList<>();
            for (int i = 0; i < arr.size(); i++) {
                Object item = arr.get(i);
                String text = stringifyStep(item);
                if (!isBlank(text)) {
                    result.add(text.trim());
                }
            }
            return result;
        }
        String text = stringifyScalar(value);
        if (isBlank(text)) {
            return List.of();
        }
        return Arrays.stream(text.split("[；;\\n]"))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static JSONArray unwrapCaseArray(JSONArray arr) {
        if (arr.size() != 1) {
            return arr;
        }
        JSONObject wrapper = toObject(arr.get(0));
        if (wrapper == null) {
            return arr;
        }
        for (String key : List.of("cases", "items", "testCases", "用例列表", "测试用例列表")) {
            Object value = wrapper.get(key);
            if (value instanceof JSONArray nested && !nested.isEmpty()) {
                return nested;
            }
        }
        return arr;
    }

    private static String stringifyStep(Object item) {
        if (item instanceof JSONObject obj) {
            String action = firstText(obj, "action", "step", "description", "content", "操作", "步骤", "描述");
            String expected = firstText(obj, "expected", "expectedResult", "预期结果", "期望结果");
            if (!isBlank(action) && !isBlank(expected)) {
                return action + "，预期：" + expected;
            }
            return !isBlank(action) ? action : stringifyScalar(item);
        }
        return stringifyScalar(item);
    }

    private static String stringifyScalar(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String text) {
            return text;
        }
        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        return "";
    }

    private static String inferExpectedFromSteps(List<String> steps) {
        if (steps == null || steps.isEmpty()) {
            return "";
        }
        String last = steps.get(steps.size() - 1);
        int marker = last.indexOf("预期：");
        if (marker >= 0 && marker + 3 < last.length()) {
            return last.substring(marker + 3).trim();
        }
        return "";
    }

    private static String normalizePriority(String value) {
        String normalized = defaultText(value, "P1");
        return switch (normalized) {
            case "P0", "P1", "P2", "P3" -> normalized;
            default -> "P1";
        };
    }

    private static String defaultText(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
