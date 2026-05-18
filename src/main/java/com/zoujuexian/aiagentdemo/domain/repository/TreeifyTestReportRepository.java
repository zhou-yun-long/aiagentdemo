package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyTestReportRepository extends JpaRepository<TreeifyTestReport, Long> {

    List<TreeifyTestReport> findByProjectIdOrderByIdDesc(Long projectId);

    List<TreeifyTestReport> findByPlanIdOrderByIdDesc(Long planId);

    long countByProjectId(Long projectId);
}
