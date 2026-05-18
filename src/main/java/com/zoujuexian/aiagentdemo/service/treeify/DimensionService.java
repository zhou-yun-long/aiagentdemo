package com.zoujuexian.aiagentdemo.service.treeify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.DimensionsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
public class DimensionService {

    private static final Logger log = LoggerFactory.getLogger(DimensionService.class);

    private final ObjectMapper objectMapper;
    private volatile DimensionsDto cached;

    public DimensionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public DimensionsDto getDimensions() {
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (cached != null) {
                return cached;
            }
            cached = loadFromJson();
            return cached;
        }
    }

    private DimensionsDto loadFromJson() {
        try (InputStream is = new ClassPathResource("data/test_dimensions.json").getInputStream()) {
            DimensionsDto dto = objectMapper.readValue(is, DimensionsDto.class);
            log.info("Loaded test dimensions: {} categories", dto.categories().size());
            return dto;
        } catch (Exception e) {
            log.error("Failed to load test_dimensions.json", e);
            throw new RuntimeException("Failed to load test dimensions", e);
        }
    }
}
