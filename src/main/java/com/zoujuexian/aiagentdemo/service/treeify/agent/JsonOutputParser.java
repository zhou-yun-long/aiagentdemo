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
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
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
