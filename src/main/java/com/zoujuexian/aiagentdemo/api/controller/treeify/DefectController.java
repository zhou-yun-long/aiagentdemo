package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.CreateDefectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.DefectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.DefectStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.TransitionDefectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.UpdateDefectRequest;
import com.zoujuexian.aiagentdemo.service.treeify.DefectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class DefectController {

    private final DefectService defectService;

    public DefectController(DefectService defectService) {
        this.defectService = defectService;
    }

    @PostMapping("/projects/{projectId}/defects")
    public ResponseEntity<ApiResponse<DefectDto>> createDefect(
            @PathVariable Long projectId,
            @RequestBody CreateDefectRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(defectService.createDefect(projectId, request)));
    }

    @GetMapping("/projects/{projectId}/defects")
    public ApiResponse<List<DefectDto>> listDefects(
            @PathVariable Long projectId,
            @RequestParam(required = false) String status
    ) {
        return ApiResponse.ok(defectService.listDefects(projectId, status));
    }

    @GetMapping("/defects/{defectId}")
    public ApiResponse<DefectDto> getDefect(@PathVariable Long defectId) {
        return ApiResponse.ok(defectService.getDefect(defectId));
    }

    @PutMapping("/defects/{defectId}")
    public ApiResponse<DefectDto> updateDefect(
            @PathVariable Long defectId,
            @RequestBody UpdateDefectRequest request
    ) {
        return ApiResponse.ok(defectService.updateDefect(defectId, request));
    }

    @PostMapping("/defects/{defectId}/transition")
    public ApiResponse<DefectDto> transitionDefect(
            @PathVariable Long defectId,
            @RequestBody TransitionDefectRequest request
    ) {
        return ApiResponse.ok(defectService.transitionDefect(
                defectId, request.targetStatus(), request.resolution()));
    }

    @GetMapping("/projects/{projectId}/defects/stats")
    public ApiResponse<DefectStatsDto> getDefectStats(@PathVariable Long projectId) {
        return ApiResponse.ok(defectService.getDefectStats(projectId));
    }
}
