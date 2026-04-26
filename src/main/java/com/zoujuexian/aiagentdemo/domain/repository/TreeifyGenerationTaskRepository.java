package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyGenerationTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyGenerationTaskRepository extends JpaRepository<TreeifyGenerationTask, String> {

    List<TreeifyGenerationTask> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);
}
