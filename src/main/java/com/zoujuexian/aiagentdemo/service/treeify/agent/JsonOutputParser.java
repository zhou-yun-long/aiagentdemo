package com.zoujuexian.aiagentdemo.service.treeify.agent;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utility for parsing and validating LLM JSON output.
 * Three-layer defense: strip markdown wrapper → parse → wrap array if needed.
 */
public final class JsonOutputParser {

    private static final Logger log = LoggerFactory.getLogger(JsonOutputParser.class);

    private JsonOutputParser() {}

    /**
     * Parse a string as JSONObject, stripping markdown code blocks if present.
     * Returns null if input is blank.
     *
     * @throws IllegalArgumentException if parsing fails after all attempts
     */
    public static JSONObject parseObject(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = stripMarkdown(raw);
        try {
            return JSON.parseObject(cleaned);
        } catch (Exception e) {
            // Try wrapping as array → object with "items" key
            try {
                JSONArray arr = JSON.parseArray(cleaned);
                JSONObject wrapper = new JSONObject();
                wrapper.put("items", arr);
                return wrapper;
            } catch (Exception e2) {
                throw new IllegalArgumentException("Failed to parse LLM response as JSON: " + truncate(raw, 200), e2);
            }
        }
    }

    /**
     * Parse a string as JSONArray, stripping markdown code blocks if present.
     * Returns null if input is blank.
     *
     * @throws IllegalArgumentException if parsing fails
     */
    public static JSONArray parseArray(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = stripMarkdown(raw);
        try {
            return JSON.parseArray(cleaned);
        } catch (Exception e) {
            // Try wrapping single object as array
            try {
                JSONObject obj = JSON.parseObject(cleaned);
                JSONArray arr = new JSONArray();
                arr.add(obj);
                return arr;
            } catch (Exception e2) {
                throw new IllegalArgumentException("Failed to parse LLM response as JSON array: " + truncate(raw, 200), e2);
            }
        }
    }

    /**
     * Safely parse JSON, returning null on failure instead of throwing.
     */
    public static Object safeParse(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return JSON.parse(json);
        } catch (Exception e) {
            log.debug("Failed to parse stored JSON: {}", e.getMessage());
            return null;
        }
    }

    private static String stripMarkdown(String raw) {
        String cleaned = raw.trim();

        // 1. Try to extract from fenced code block (anywhere in text)
        int fenceStart = cleaned.indexOf("```");
        if (fenceStart >= 0) {
            int contentStart = cleaned.indexOf('\n', fenceStart);
            if (contentStart < 0) contentStart = fenceStart + 3;
            else contentStart++;
            int fenceEnd = cleaned.lastIndexOf("```");
            if (fenceEnd > contentStart) {
                cleaned = cleaned.substring(contentStart, fenceEnd).trim();
            }
        }

        // 2. Strip leading markdown fences if still present
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }

        cleaned = cleaned.trim();

        // 3. If text contains prose mixed with JSON, try to extract the JSON block
        if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
            String extracted = extractJsonBlock(cleaned);
            if (extracted != null) {
                cleaned = extracted;
            }
        }

        // 4. Fix common LLM JSON malformations
        cleaned = fixCommonIssues(cleaned);

        return cleaned;
    }

    /**
     * Try to find and extract a JSON object or array from mixed text.
     */
    private static String extractJsonBlock(String text) {
        // Find first { or [
        int objIdx = text.indexOf('{');
        int arrIdx = text.indexOf('[');
        int start;
        char open, close;
        if (objIdx >= 0 && (arrIdx < 0 || objIdx < arrIdx)) {
            start = objIdx;
            open = '{';
            close = '}';
        } else if (arrIdx >= 0) {
            start = arrIdx;
            open = '[';
            close = ']';
        } else {
            return null;
        }
        // Find matching closing bracket by counting depth
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (escaped) {
                escaped = false;
                continue;
            }
            if (c == '\\') {
                escaped = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;
            if (c == open) depth++;
            if (c == close) {
                depth--;
                if (depth == 0) {
                    return text.substring(start, i + 1).trim();
                }
            }
        }
        return null;
    }

    /**
     * Fix common LLM JSON malformations: trailing commas.
     * Note: Do NOT strip // comments with a blanket regex — it corrupts string values
     * that happen to contain "//" (e.g. URLs or paths inside JSON strings).
     */
    private static String fixCommonIssues(String json) {
        // Remove trailing commas before } or ]
        json = json.replaceAll(",\\s*([}\\]])", "$1");
        return json.trim();
    }

    /**
     * Convert an object to JSON string, returning "无" for null.
     */
    public static String stringify(Object value) {
        return value == null ? "无" : JSON.toJSONString(value);
    }

    public static String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "...";
    }
}
