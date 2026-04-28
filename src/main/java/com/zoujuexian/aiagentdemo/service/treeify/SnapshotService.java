package com.zoujuexian.aiagentdemo.service.treeify;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateSnapshotRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.SnapshotDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.TestCaseDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyCaseSnapshot;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyCaseSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SnapshotService {

    private final TreeifyCaseSnapshotRepository snapshotRepo;
    private final TreeifyPersistenceService persistenceService;
    private final ObjectMapper objectMapper;

    public SnapshotService(TreeifyCaseSnapshotRepository snapshotRepo,
                           TreeifyPersistenceService persistenceService,
                           ObjectMapper objectMapper) {
        this.snapshotRepo = snapshotRepo;
        this.persistenceService = persistenceService;
        this.objectMapper = objectMapper;
    }

    public List<SnapshotDto> listSnapshots(Long projectId) {
        persistenceService.findProject(projectId);
        return snapshotRepo.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SnapshotDto createSnapshot(Long projectId, CreateSnapshotRequest request, String nodesJson) {
        persistenceService.findProject(projectId);

        String data;
        int nodeCount = 0;
        if (nodesJson != null && !nodesJson.isBlank()) {
            data = nodesJson;
            try {
                var nodes = objectMapper.readValue(nodesJson, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {});
                nodeCount = nodes.size();
            } catch (JsonProcessingException e) {
                throw new BusinessException(ApiErrorCode.BAD_REQUEST, "节点数据格式错误");
            }
        } else {
            List<TestCaseDto> cases = persistenceService.listCases(projectId);
            try {
                data = objectMapper.writeValueAsString(cases);
            } catch (JsonProcessingException e) {
                throw new BusinessException(ApiErrorCode.INTERNAL_ERROR, "序列化用例数据失败");
            }
            nodeCount = cases.size();
        }

        TreeifyCaseSnapshot entity = new TreeifyCaseSnapshot();
        entity.setProjectId(projectId);
        entity.setName(request.name() != null && !request.name().isBlank()
                ? request.name().trim()
                : "快照 " + LocalDateTime.now().toString().replace("T", " ").substring(0, 19));
        entity.setDescription(request.description() != null ? request.description().trim() : "");
        entity.setCaseCount(nodeCount);
        entity.setFormat("json");
        entity.setData(data);
        entity.setCreatedAt(LocalDateTime.now());

        return toDto(snapshotRepo.save(entity));
    }

    public SnapshotDto getSnapshot(Long snapshotId) {
        return toDto(findSnapshot(snapshotId));
    }

    @Transactional
    public void deleteSnapshot(Long snapshotId) {
        TreeifyCaseSnapshot entity = findSnapshot(snapshotId);
        snapshotRepo.delete(entity);
    }

    private TreeifyCaseSnapshot findSnapshot(Long snapshotId) {
        return snapshotRepo.findById(snapshotId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "快照不存在: " + snapshotId));
    }

    private SnapshotDto toDto(TreeifyCaseSnapshot entity) {
        return new SnapshotDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getDescription(),
                entity.getCaseCount(),
                entity.getFormat(),
                entity.getData(),
                entity.getCreatedAt()
        );
    }
}
