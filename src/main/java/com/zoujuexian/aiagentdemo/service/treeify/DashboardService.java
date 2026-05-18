package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.DashboardDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyCaseSnapshot;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyGenerationTask;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProject;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyCaseSnapshotRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyGenerationTaskRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyProjectRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final TreeifyProjectRepository projectRepository;
    private final TreeifyTestCaseRepository testCaseRepository;
    private final TreeifyCaseSnapshotRepository snapshotRepository;
    private final TreeifyGenerationTaskRepository generationTaskRepository;

    public DashboardService(TreeifyProjectRepository projectRepository,
                            TreeifyTestCaseRepository testCaseRepository,
                            TreeifyCaseSnapshotRepository snapshotRepository,
                            TreeifyGenerationTaskRepository generationTaskRepository) {
        this.projectRepository = projectRepository;
        this.testCaseRepository = testCaseRepository;
        this.snapshotRepository = snapshotRepository;
        this.generationTaskRepository = generationTaskRepository;
    }

    public DashboardDto getDashboard(Long projectId) {
        TreeifyProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "项目不存在: " + projectId));

        long totalCases = testCaseRepository.countByProjectId(projectId);
        long coveredCases = testCaseRepository.countByProjectIdAndExecutionStatusNot(projectId, "not_run");
        long passedCases = testCaseRepository.countByProjectIdAndExecutionStatus(projectId, "passed");
        long failedCases = testCaseRepository.countByProjectIdAndExecutionStatus(projectId, "failed");
        long blockedCases = testCaseRepository.countByProjectIdAndExecutionStatus(projectId, "blocked");

        double passRate = totalCases > 0 ? (double) passedCases / totalCases * 100.0 : 0.0;

        List<DashboardDto.RecentActivity> recentActivity = buildRecentActivity(projectId);

        return new DashboardDto(
                totalCases,
                coveredCases,
                passedCases,
                failedCases,
                blockedCases,
                passRate,
                recentActivity
        );
    }

    private List<DashboardDto.RecentActivity> buildRecentActivity(Long projectId) {
        List<DashboardDto.RecentActivity> activities = new ArrayList<>();

        List<TreeifyCaseSnapshot> snapshots = snapshotRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        for (TreeifyCaseSnapshot snapshot : snapshots) {
            activities.add(new DashboardDto.RecentActivity(
                    "snapshot",
                    "创建快照: " + snapshot.getName() + " (" + snapshot.getCaseCount() + " 个用例)",
                    snapshot.getCreatedAt()
            ));
        }

        List<TreeifyGenerationTask> tasks = generationTaskRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId);
        for (TreeifyGenerationTask task : tasks) {
            activities.add(new DashboardDto.RecentActivity(
                    "generation",
                    "生成任务: " + task.getTaskId(),
                    task.getCreatedAt()
            ));
        }

        activities.sort(Comparator.comparing(DashboardDto.RecentActivity::timestamp).reversed());

        return activities.size() > 10 ? activities.subList(0, 10) : activities;
    }
}
