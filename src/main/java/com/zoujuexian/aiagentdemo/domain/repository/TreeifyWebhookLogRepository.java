package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyWebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreeifyWebhookLogRepository extends JpaRepository<TreeifyWebhookLog, Long> {

    List<TreeifyWebhookLog> findAllByTokenIdOrderByIdDesc(Long tokenId);
}
