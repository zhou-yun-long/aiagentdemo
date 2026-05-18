package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyPlanCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface TreeifyPlanCaseRepository extends JpaRepository<TreeifyPlanCase, Long> {

    List<TreeifyPlanCase> findByPlanIdOrderById(Long planId);

    List<TreeifyPlanCase> findByCaseIdOrderById(Long caseId);

    Optional<TreeifyPlanCase> findByPlanIdAndCaseId(Long planId, Long caseId);

    long countByPlanId(Long planId);

    long countByPlanIdAndExecutionResult(Long planId, String executionResult);

    @Query("SELECT pc.executionResult, COUNT(pc) FROM TreeifyPlanCase pc WHERE pc.planId = :planId GROUP BY pc.executionResult")
    List<Object[]> countByPlanIdGroupByResult(Long planId);
}
