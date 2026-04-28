package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProjectSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TreeifyProjectSummaryRepository extends JpaRepository<TreeifyProjectSummary, Long> {

    Optional<TreeifyProjectSummary> findByProjectIdAndCurrentTrue(Long projectId);

    Optional<TreeifyProjectSummary> findByProjectIdAndVersion(Long projectId, int version);

    List<TreeifyProjectSummary> findAllByProjectIdOrderByVersionDesc(Long projectId);

    List<TreeifyProjectSummary> findAllByProjectIdAndVersionGreaterThanOrderByVersionDesc(Long projectId, int version);

    @Query("SELECT COALESCE(MAX(s.version), 0) FROM TreeifyProjectSummary s WHERE s.projectId = :projectId")
    int findMaxVersion(@Param("projectId") Long projectId);
}
