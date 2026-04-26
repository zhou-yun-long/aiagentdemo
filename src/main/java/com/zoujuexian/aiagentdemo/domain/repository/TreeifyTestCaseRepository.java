package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyTestCaseRepository extends JpaRepository<TreeifyTestCase, Long> {

    List<TreeifyTestCase> findAllByProjectIdOrderById(Long projectId);

    long countByProjectId(Long projectId);

    long countByProjectIdAndExecutionStatusNot(Long projectId, String executionStatus);

    long countByProjectIdAndExecutionStatus(Long projectId, String executionStatus);
}
