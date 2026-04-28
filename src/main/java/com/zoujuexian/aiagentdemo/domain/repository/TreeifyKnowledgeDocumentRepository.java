package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyKnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TreeifyKnowledgeDocumentRepository extends JpaRepository<TreeifyKnowledgeDocument, Long> {

    List<TreeifyKnowledgeDocument> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);

    @Query("SELECT d FROM TreeifyKnowledgeDocument d WHERE d.projectId = :projectId " +
           "AND (LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY d.createdAt DESC")
    List<TreeifyKnowledgeDocument> searchByKeyword(@Param("projectId") Long projectId, @Param("keyword") String keyword);
}
