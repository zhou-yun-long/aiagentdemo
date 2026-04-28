package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateSnapshotRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.SnapshotDto;
import com.zoujuexian.aiagentdemo.service.treeify.SnapshotService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class SnapshotController {

    private final SnapshotService snapshotService;

    public SnapshotController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @GetMapping("/projects/{projectId}/snapshots")
    public ApiResponse<List<SnapshotDto>> listSnapshots(@PathVariable Long projectId) {
        return ApiResponse.ok(snapshotService.listSnapshots(projectId));
    }

    @PostMapping("/projects/{projectId}/snapshots")
    public ResponseEntity<ApiResponse<SnapshotDto>> createSnapshot(
            @PathVariable Long projectId,
            @RequestBody(required = false) CreateSnapshotRequest request) {
        CreateSnapshotRequest safeRequest = request != null ? request : new CreateSnapshotRequest(null, null, null);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(snapshotService.createSnapshot(projectId, safeRequest, safeRequest.data())));
    }

    @GetMapping("/snapshots/{snapshotId}")
    public ApiResponse<SnapshotDto> getSnapshot(@PathVariable Long snapshotId) {
        return ApiResponse.ok(snapshotService.getSnapshot(snapshotId));
    }

    @DeleteMapping("/snapshots/{snapshotId}")
    public ApiResponse<Void> deleteSnapshot(@PathVariable Long snapshotId) {
        snapshotService.deleteSnapshot(snapshotId);
        return ApiResponse.ok(null);
    }
}
