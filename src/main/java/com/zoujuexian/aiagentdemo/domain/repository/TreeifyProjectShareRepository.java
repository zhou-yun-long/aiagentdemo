package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyProjectShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TreeifyProjectShareRepository extends JpaRepository<TreeifyProjectShare, Long> {

    Optional<TreeifyProjectShare> findByShareTokenAndActiveTrue(String shareToken);

    Optional<TreeifyProjectShare> findByProjectIdAndActiveTrue(Long projectId);
}
