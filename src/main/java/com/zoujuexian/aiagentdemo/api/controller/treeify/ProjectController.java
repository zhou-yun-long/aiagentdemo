package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ProjectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ShareDataDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ShareDto;
import com.zoujuexian.aiagentdemo.service.treeify.MockTreeifyService;
import com.zoujuexian.aiagentdemo.service.treeify.ShareService;
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
@RequestMapping("/api/v1")
public class ProjectController {

    private final MockTreeifyService treeifyService;
    private final ShareService shareService;

    public ProjectController(MockTreeifyService treeifyService, ShareService shareService) {
        this.treeifyService = treeifyService;
        this.shareService = shareService;
    }

    @GetMapping("/projects")
    public ApiResponse<List<ProjectDto>> listProjects() {
        return ApiResponse.ok(treeifyService.listProjects());
    }

    @PostMapping("/projects")
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(@RequestBody ProjectRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(treeifyService.createProject(request)));
    }

    @GetMapping("/projects/{projectId}")
    public ApiResponse<ProjectDto> getProject(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.getProject(projectId));
    }

    @PutMapping("/projects/{projectId}")
    public ApiResponse<ProjectDto> updateProject(@PathVariable Long projectId, @RequestBody ProjectRequest request) {
        return ApiResponse.ok(treeifyService.updateProject(projectId, request));
    }

    @DeleteMapping("/projects/{projectId}")
    public ApiResponse<ProjectDto> archiveProject(@PathVariable Long projectId) {
        return ApiResponse.ok(treeifyService.archiveProject(projectId));
    }

    @PostMapping("/projects/{projectId}/share")
    public ResponseEntity<ApiResponse<ShareDto>> createShare(@PathVariable Long projectId) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(shareService.createShare(projectId)));
    }

    @GetMapping("/projects/{projectId}/share")
    public ApiResponse<ShareDto> getShare(@PathVariable Long projectId) {
        return ApiResponse.ok(shareService.getShare(projectId));
    }

    @DeleteMapping("/projects/{projectId}/share")
    public ApiResponse<Void> revokeShare(@PathVariable Long projectId) {
        shareService.revokeShare(projectId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/share/{token}")
    public ApiResponse<ShareDataDto> getShareData(@PathVariable String token) {
        return ApiResponse.ok(shareService.getShareData(token));
    }
}
