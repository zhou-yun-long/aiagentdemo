package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface TreeifyTestCaseRepository extends JpaRepository<TreeifyTestCase, Long> {

    List<TreeifyTestCase> findAllByProjectIdOrderById(Long projectId);

    long countByProjectId(Long projectId);

    long countByProjectIdAndExecutionStatusNot(Long projectId, String executionStatus);

    long countByProjectIdAndExecutionStatus(Long projectId, String executionStatus);

    long countByProjectIdAndReviewStatus(Long projectId, String reviewStatus);

    List<TreeifyTestCase> findAllByProjectIdAndReviewStatusOrderById(Long projectId, String reviewStatus);

    @Query("SELECT t.projectId, COUNT(t), " +
           "SUM(CASE WHEN t.executionStatus != 'not_run' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN t.executionStatus = 'passed' THEN 1 ELSE 0 END) " +
           "FROM TreeifyTestCase t GROUP BY t.projectId")
    List<Object[]> countStatsGroupedByProject();
}
