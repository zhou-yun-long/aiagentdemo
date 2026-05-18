package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyDefect;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyDefectRepository extends JpaRepository<TreeifyDefect, Long> {

    List<TreeifyDefect> findAllByProjectIdOrderByIdDesc(Long projectId);

    List<TreeifyDefect> findAllByProjectIdAndStatusOrderByIdDesc(Long projectId, String status);

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, String status);

    long countByProjectIdAndSeverity(Long projectId, String severity);

    List<TreeifyDefect> findByCaseIdOrderByIdDesc(Long caseId);
}
