package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProjectSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TreeifyProjectSummaryRepository extends JpaRepository<TreeifyProjectSummary, Long> {

    Optional<TreeifyProjectSummary> findByProjectIdAndCurrentTrue(Long projectId);

    List<TreeifyProjectSummary> findAllByProjectIdOrderByVersionDesc(Long projectId);

    List<TreeifyProjectSummary> findAllByProjectIdAndVersionGreaterThanOrderByVersionDesc(Long projectId, int version);
}
