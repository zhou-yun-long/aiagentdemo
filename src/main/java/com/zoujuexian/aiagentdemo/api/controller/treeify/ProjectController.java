package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.service.treeify.MockTreeifyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final MockTreeifyService treeifyService;

    public ProjectController(MockTreeifyService treeifyService) {
        this.treeifyService = treeifyService;
    }

    @GetMapping
    public ApiResponse<List<ProjectDto>> listProjects() {
        return ApiResponse.ok(treeifyService.listProjects());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(@RequestBody ProjectRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(treeifyService.createProject(request)));
    }

    @GetMapping("/{projectId}")
    public ApiResponse<ProjectDto> getProject(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.getProject(projectId));
    }

    @PutMapping("/{projectId}")
    public ApiResponse<ProjectDto> updateProject(@PathVariable Long projectId, @RequestBody ProjectRequest request) {
        return ApiResponse.ok(treeifyService.updateProject(projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ApiResponse<ProjectDto> archiveProject(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.archiveProject(projectId));
    }
}
