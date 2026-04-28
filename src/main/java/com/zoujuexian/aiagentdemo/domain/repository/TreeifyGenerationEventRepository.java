package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyGenerationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreeifyGenerationEventRepository extends JpaRepository<TreeifyGenerationEvent, Long> {

    List<TreeifyGenerationEvent> findAllByTaskIdOrderBySequenceAsc(String taskId);

    void deleteByTaskId(String taskId);
}
