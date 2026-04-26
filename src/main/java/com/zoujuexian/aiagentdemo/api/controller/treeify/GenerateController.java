package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ConfirmGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateGenerateTaskRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateSseEventDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.GenerateTaskDto;
import com.zoujuexian.aiagentdemo.service.treeify.MockTreeifyService;
import com.zoujuexian.aiagentdemo.service.treeify.TreeifyGenerationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1")
public class GenerateController {

    private final MockTreeifyService treeifyService;
    private final TreeifyGenerationService generationService;

    public GenerateController(MockTreeifyService treeifyService, TreeifyGenerationService generationService) {
        this.treeifyService = treeifyService;
        this.generationService = generationService;
    }

    @PostMapping("/projects/{projectId}/generate")
    public ResponseEntity<ApiResponse<GenerateTaskDto>> createGenerateTask(
            @PathVariable Long projectId,
            @RequestBody CreateGenerateTaskRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok(treeifyService.createGenerateTask(projectId, request)));
    }

    @GetMapping("/generate/{taskId}")
    public ApiResponse<GenerateTaskDto> getGenerateTask(@PathVariable String taskId) {
        return ApiResponse.ok(treeifyService.getTask(taskId));
    }

    @GetMapping(value = "/generate/{taskId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<GenerateSseEventDto>> streamGenerateTask(@PathVariable String taskId) {
        GenerateTaskDto task = treeifyService.getTask(taskId);
        String input = treeifyService.getTaskInput(taskId);
        return Flux.fromIterable(generationService.buildEvents(taskId, task.mode(), input, task.currentStage()))
                .delayElements(Duration.ofMillis(350))
                .doOnNext(treeifyService::applyEvent)
                .map(event -> ServerSentEvent.<GenerateSseEventDto>builder()
                        .id(String.valueOf(event.sequence()))
                        .data(event)
                        .build());
    }

    @PostMapping("/generate/{taskId}/confirm")
    public ApiResponse<GenerateTaskDto> confirmGenerateTask(
            @PathVariable String taskId,
            @RequestBody(required = false) ConfirmGenerateTaskRequest request
    ) {
        return ApiResponse.ok(treeifyService.confirmTask(taskId, request));
    }

    @PostMapping("/generate/{taskId}/cancel")
    public ApiResponse<GenerateTaskDto> cancelGenerateTask(@PathVariable String taskId) {
        return ApiResponse.ok(treeifyService.cancelTask(taskId));
    }
}
