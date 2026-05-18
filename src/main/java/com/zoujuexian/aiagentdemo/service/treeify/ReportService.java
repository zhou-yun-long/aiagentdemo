package com.zoujuexian.aiagentdemo.service.treeify;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.FailedCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.ReportSummaryDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.TestReportDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyPlanCase;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestPlan;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestReport;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyPlanCaseRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestPlanRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private final TreeifyTestReportRepository reportRepo;
    private final TreeifyPlanCaseRepository planCaseRepo;
    private final TreeifyTestPlanRepository planRepo;
    private final TreeifyTestCaseRepository caseRepo;

    public ReportService(
            TreeifyTestReportRepository reportRepo,
            TreeifyPlanCaseRepository planCaseRepo,
            TreeifyTestPlanRepository planRepo,
            TreeifyTestCaseRepository caseRepo
    ) {
        this.reportRepo = reportRepo;
        this.planCaseRepo = planCaseRepo;
        this.planRepo = planRepo;
        this.caseRepo = caseRepo;
    }

    @Transactional
    public TestReportDto createReport(Long projectId, Long planId) {
        TreeifyTestPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "测试计划不存在: " + planId));

        if (!plan.getProjectId().equals(projectId)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "计划不属于该项目");
        }

        ReportSummaryDto summary = buildSummary(planId);

        TreeifyTestReport report = new TreeifyTestReport();
        report.setProjectId(projectId);
        report.setPlanId(planId);
        report.setName(plan.getName() + " - 测试报告");
        report.setSummaryJson(JSON.toJSONString(summary));
        report.setCreatedAt(LocalDateTime.now());
        report.setCreatedBy(null); // no auth context

        TreeifyTestReport saved = reportRepo.save(report);
        return toDto(saved);
    }

    public TestReportDto getReport(Long reportId) {
        TreeifyTestReport report = findReport(reportId);
        return toDto(report);
    }

    public List<TestReportDto> listReports(Long projectId) {
        return reportRepo.findByProjectIdOrderByIdDesc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    public ReportSummaryDto getReportSummary(Long reportId) {
        TreeifyTestReport report = findReport(reportId);
        return JSON.parseObject(report.getSummaryJson(), ReportSummaryDto.class);
    }

    public List<FailedCaseDto> getFailedCases(Long reportId) {
        TreeifyTestReport report = findReport(reportId);
        List<TreeifyPlanCase> planCases = planCaseRepo.findByPlanIdOrderById(report.getPlanId());

        List<FailedCaseDto> failedCases = new ArrayList<>();
        for (TreeifyPlanCase pc : planCases) {
            String result = pc.getExecutionResult();
            if ("fail".equals(result) || "blocked".equals(result)) {
                String caseTitle = caseRepo.findById(pc.getCaseId())
                        .map(TreeifyTestCase::getTitle)
                        .orElse(null);
                String priority = caseRepo.findById(pc.getCaseId())
                        .map(TreeifyTestCase::getPriority)
                        .orElse(null);
                failedCases.add(new FailedCaseDto(
                        pc.getCaseId(),
                        caseTitle,
                        priority,
                        result,
                        pc.getNote()
                ));
            }
        }
        return failedCases;
    }

    // ──── Internal helpers ────

    private ReportSummaryDto buildSummary(Long planId) {
        List<TreeifyPlanCase> planCases = planCaseRepo.findByPlanIdOrderById(planId);
        int totalCases = planCases.size();
        int passedCases = 0;
        int failedCases = 0;
        int blockedCases = 0;
        int skippedCases = 0;
        Map<String, Integer> priorityDistribution = new HashMap<>();

        for (TreeifyPlanCase pc : planCases) {
            String result = pc.getExecutionResult();
            if ("pass".equals(result)) passedCases++;
            else if ("fail".equals(result)) failedCases++;
            else if ("blocked".equals(result)) blockedCases++;
            else if ("skipped".equals(result)) skippedCases++;

            // Priority distribution from the test case
            caseRepo.findById(pc.getCaseId()).ifPresent(tc -> {
                String priority = tc.getPriority();
                if (priority != null && !priority.isBlank()) {
                    priorityDistribution.merge(priority, 1, Integer::sum);
                }
            });
        }

        double passRate = totalCases > 0 ? (double) passedCases / totalCases * 100.0 : 0.0;

        return new ReportSummaryDto(
                totalCases,
                passedCases,
                failedCases,
                blockedCases,
                skippedCases,
                Math.round(passRate * 100.0) / 100.0,
                priorityDistribution
        );
    }

    private TreeifyTestReport findReport(Long reportId) {
        return reportRepo.findById(reportId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "测试报告不存在: " + reportId));
    }

    private TestReportDto toDto(TreeifyTestReport entity) {
        return new TestReportDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getPlanId(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }
}
