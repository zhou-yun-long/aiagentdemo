package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyMindmapNode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreeifyMindmapNodeRepository extends JpaRepository<TreeifyMindmapNode, String> {

    List<TreeifyMindmapNode> findAllByProjectIdOrderByOrderIndexAscDepthAscIdAsc(Long projectId);

    void deleteByProjectId(Long projectId);
}
