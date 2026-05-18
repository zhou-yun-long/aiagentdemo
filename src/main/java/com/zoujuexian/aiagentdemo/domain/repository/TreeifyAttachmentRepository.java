package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyAttachmentRepository extends JpaRepository<TreeifyAttachment, String> {

    List<TreeifyAttachment> findByProjectIdOrderByIdDesc(Long projectId);

    List<TreeifyAttachment> findByProjectIdAndPurposeOrderByIdDesc(Long projectId, String purpose);

    long countByProjectId(Long projectId);
}
