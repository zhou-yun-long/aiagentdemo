package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyTestPlanRepository extends JpaRepository<TreeifyTestPlan, Long> {

    List<TreeifyTestPlan> findAllByProjectIdOrderByIdDesc(Long projectId);
}
