package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.*;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProjectShare;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyProjectShareRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ShareService {

    private final TreeifyProjectShareRepository shareRepo;
    private final TreeifyPersistenceService persistenceService;

    public ShareService(TreeifyProjectShareRepository shareRepo,
                        TreeifyPersistenceService persistenceService) {
        this.shareRepo = shareRepo;
        this.persistenceService = persistenceService;
    }

    @Transactional
    public ShareDto createShare(Long projectId) {
        persistenceService.findProject(projectId);

        return shareRepo.findByProjectIdAndActiveTrue(projectId)
                .map(this::toDto)
                .orElseGet(() -> {
                    TreeifyProjectShare entity = new TreeifyProjectShare();
                    entity.setProjectId(projectId);
                    entity.setShareToken(UUID.randomUUID().toString().replace("-", ""));
                    entity.setActive(true);
                    entity.setCreatedAt(LocalDateTime.now());
                    return toDto(shareRepo.save(entity));
                });
    }

    public ShareDto getShare(Long projectId) {
        persistenceService.findProject(projectId);
        return shareRepo.findByProjectIdAndActiveTrue(projectId)
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional
    public void revokeShare(Long projectId) {
        persistenceService.findProject(projectId);
        shareRepo.findByProjectIdAndActiveTrue(projectId)
                .ifPresent(entity -> {
                    entity.setActive(false);
                    shareRepo.save(entity);
                });
    }

    public ShareDataDto getShareData(String token) {
        TreeifyProjectShare share = shareRepo.findByShareTokenAndActiveTrue(token)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "分享链接已失效"));

        Long projectId = share.getProjectId();
        ProjectDto project = persistenceService.getProject(projectId);
        List<TestCaseDto> cases = persistenceService.listCases(projectId);
        List<MindmapNodeDto> mindmap = persistenceService.getMindmap(projectId);
        CaseStatsDto stats = persistenceService.getCaseStats(projectId);

        return new ShareDataDto(project, cases, mindmap, stats);
    }

    private ShareDto toDto(TreeifyProjectShare entity) {
        return new ShareDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getShareToken(),
                "/share/" + entity.getShareToken(),
                entity.isActive(),
                entity.getCreatedAt()
        );
    }
}
