package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyCaseSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreeifyCaseSnapshotRepository extends JpaRepository<TreeifyCaseSnapshot, Long> {

    List<TreeifyCaseSnapshot> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
