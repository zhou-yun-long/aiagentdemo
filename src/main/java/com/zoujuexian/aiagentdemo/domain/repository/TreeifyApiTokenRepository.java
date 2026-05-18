package com.zoujuexian.aiagentdemo.domain.repository;

import com.zoujuexian.aiagentdemo.domain.entity.TreeifyApiToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TreeifyApiTokenRepository extends JpaRepository<TreeifyApiToken, Long> {

    Optional<TreeifyApiToken> findByTokenAndActiveTrue(String token);

    List<TreeifyApiToken> findAllByProjectIdOrderByIdDesc(Long projectId);

    boolean existsByToken(String token);

    long countByProjectIdAndActiveTrue(Long projectId);
}
