package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CriticReportDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventName;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerationConfig;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GeneratedCaseDto;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyGenerationService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Test-only TreeifyGenerationService that handles taskKind routing:
 * - "cases" / "api_cases": full pipeline (E1 -> E2 -> E3 -> Critic -> GENERATION_COMPLETE)
 * - "points": stops after E2 and emits POINTS_COMPLETE
 *
 * Overrides the production bean via same name + allow-bean-definition-overriding.
 */
@TestConfiguration
public class TestGenerationServiceConfig {

    @Bean
    @Primary
    public TreeifyGenerationService treeifyGenerationService() {
        return new TreeifyGenerationService() {
            @Override
            public List<GenerateSseEventDto> buildEvents(String taskId, String mode, String input,
                                                          String currentStage, String e1Result, String e2Result,
                                                          String feedback, Long projectId) {
                return buildDefaultEvents(taskId);
            }

            @Override
            public Flux<GenerateSseEventDto> streamEvents(String taskId, String mode, String input,
                                                           String currentStage, String e1Result, String e2Result,
                                                           String feedback, Long projectId,
                                                           GenerationConfig config) {
                String taskKind = (config != null && config.taskKind() != null)
                        ? config.taskKind() : "cases";

                List<GenerateSseEventDto> events;
                if ("points".equals(taskKind)) {
                    events = buildPointsEvents(taskId);
                } else {
                    events = buildDefaultEvents(taskId);
                }
                return Flux.fromIterable(events);
            }

            private List<GenerateSseEventDto> buildDefaultEvents(String taskId) {
                long seq = 1;
                List<GeneratedCaseDto> cases = List.of(
                        new GeneratedCaseDto("Generated Case 1", "precondition",
                                List.of("step1"), "expected", "P0",
                                List.of("Web"), "ai", "happy",
                                "case-gen-1", List.of("obj-1"), List.of("req-1"),
                                null, null, null)
                );
                return List.of(
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "e1", seq++,
                                Map.of("needConfirm", false, "result", Map.of("requirements", List.of()))),
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "e2", seq++,
                                Map.of("needConfirm", false, "result", Map.of("objects", List.of()))),
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "e3", seq++, Map.of("stage", "e3")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "e3", seq++,
                                Map.of("needConfirm", false, "result", cases)),
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "critic", seq++, Map.of("stage", "critic")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "critic", seq++,
                                Map.of("needConfirm", false, "result",
                                        new CriticReportDto(90, List.of("good coverage"), 0))),
                        event(taskId, GenerateSseEventName.GENERATION_COMPLETE, null, seq++,
                                Map.of("criticScore", 90, "cases", cases))
                );
            }

            private List<GenerateSseEventDto> buildPointsEvents(String taskId) {
                long seq = 1;
                return List.of(
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "e1", seq++, Map.of("stage", "e1")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "e1", seq++,
                                Map.of("needConfirm", false, "result", Map.of("requirements", List.of()))),
                        event(taskId, GenerateSseEventName.STAGE_STARTED, "e2", seq++, Map.of("stage", "e2")),
                        event(taskId, GenerateSseEventName.STAGE_DONE, "e2", seq++,
                                Map.of("needConfirm", false, "result", Map.of("objects", List.of()))),
                        event(taskId, GenerateSseEventName.POINTS_COMPLETE, null, seq++,
                                Map.of("e1Result", Map.of(), "e2Result", Map.of()))
                );
            }

            private GenerateSseEventDto event(String taskId, GenerateSseEventName type,
                                               String stage, long sequence, Object payload) {
                return new GenerateSseEventDto(type, taskId, stage, sequence, LocalDateTime.now(), payload);
            }
        };
    }
}
