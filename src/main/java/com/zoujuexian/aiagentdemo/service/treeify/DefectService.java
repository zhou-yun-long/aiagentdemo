package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.CreateDefectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.DefectDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.DefectStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.TransitionDefectRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.defect.UpdateDefectRequest;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyDefect;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyDefectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class DefectService {

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "open", List.of("in_progress"),
            "in_progress", List.of("resolved", "closed"),
            "resolved", List.of("closed", "reopened"),
            "reopened", List.of("in_progress", "closed")
    );

    private final TreeifyDefectRepository defectRepository;
    private final TreeifyPersistenceService persistenceService;

    public DefectService(TreeifyDefectRepository defectRepository,
                         TreeifyPersistenceService persistenceService) {
        this.defectRepository = defectRepository;
        this.persistenceService = persistenceService;
    }

    public DefectDto createDefect(Long projectId, CreateDefectRequest request) {
        persistenceService.findProject(projectId);
        if (request == null || request.title() == null || request.title().isBlank()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "缺陷标题不能为空");
        }

        TreeifyDefect entity = new TreeifyDefect();
        entity.setProjectId(projectId);
        entity.setTitle(request.title().trim());
        entity.setDescription(request.description());
        entity.setSeverity(request.severity() != null && !request.severity().isBlank()
                ? request.severity().trim() : "medium");
        entity.setStatus("open");
        entity.setCaseId(request.caseId());
        entity.setPlanId(request.planId());
        entity.setReporter(request.reporter());
        entity.setAssignee(request.assignee());

        return toDto(defectRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<DefectDto> listDefects(Long projectId, String statusFilter) {
        persistenceService.findProject(projectId);
        List<TreeifyDefect> defects;
        if (statusFilter != null && !statusFilter.isBlank()) {
            defects = defectRepository.findAllByProjectIdAndStatusOrderByIdDesc(projectId, statusFilter.trim());
        } else {
            defects = defectRepository.findAllByProjectIdOrderByIdDesc(projectId);
        }
        return defects.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DefectDto getDefect(Long defectId) {
        return toDto(findDefect(defectId));
    }

    public DefectDto updateDefect(Long defectId, UpdateDefectRequest request) {
        TreeifyDefect entity = findDefect(defectId);
        if (request == null) {
            return toDto(entity);
        }
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.severity() != null && !request.severity().isBlank()) {
            entity.setSeverity(request.severity().trim());
        }
        if (request.assignee() != null) {
            entity.setAssignee(request.assignee().isBlank() ? null : request.assignee().trim());
        }
        return toDto(defectRepository.save(entity));
    }

    public DefectDto transitionDefect(Long defectId, String targetStatus, String resolution) {
        TreeifyDefect entity = findDefect(defectId);
        String currentStatus = entity.getStatus();

        List<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, List.of());
        if (!allowed.contains(targetStatus)) {
            throw new BusinessException(ApiErrorCode.DEFECT_INVALID_STATE,
                    "缺陷状态 " + currentStatus + " 不允许转换到 " + targetStatus);
        }

        entity.setStatus(targetStatus);
        if ("resolved".equals(targetStatus) && resolution != null && !resolution.isBlank()) {
            entity.setResolution(resolution.trim());
        }
        return toDto(defectRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public DefectStatsDto getDefectStats(Long projectId) {
        persistenceService.findProject(projectId);
        long total = defectRepository.countByProjectId(projectId);
        long open = defectRepository.countByProjectIdAndStatus(projectId, "open");
        long inProgress = defectRepository.countByProjectIdAndStatus(projectId, "in_progress");
        long resolved = defectRepository.countByProjectIdAndStatus(projectId, "resolved");
        long closed = defectRepository.countByProjectIdAndStatus(projectId, "closed");
        long reopened = defectRepository.countByProjectIdAndStatus(projectId, "reopened");
        return new DefectStatsDto(total, open, inProgress, resolved, closed, reopened);
    }

    private TreeifyDefect findDefect(Long defectId) {
        return defectRepository.findById(defectId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "缺陷不存在: " + defectId));
    }

    private DefectDto toDto(TreeifyDefect entity) {
        return new DefectDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getSeverity(),
                entity.getStatus(),
                entity.getCaseId(),
                entity.getPlanId(),
                entity.getReporter(),
                entity.getAssignee(),
                entity.getResolution(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
