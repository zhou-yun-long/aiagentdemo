package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyCaseReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreeifyCaseReviewRepository extends JpaRepository<TreeifyCaseReview, Long> {

    List<TreeifyCaseReview> findByCaseIdOrderByIdDesc(Long caseId);

    long countByStatus(String status);

    long countByCaseIdAndStatus(Long caseId, String status);
}
