package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.ApiTokenDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CiCaseResult;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CiExecutionPayload;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CiExecutionResponse;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyApiToken;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyWebhookLog;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyApiTokenRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyWebhookLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CiIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(CiIntegrationService.class);

    private final TreeifyApiTokenRepository tokenRepository;
    private final TreeifyTestCaseRepository testCaseRepository;
    private final TreeifyWebhookLogRepository webhookLogRepository;

    public CiIntegrationService(TreeifyApiTokenRepository tokenRepository,
                                TreeifyTestCaseRepository testCaseRepository,
                                TreeifyWebhookLogRepository webhookLogRepository) {
        this.tokenRepository = tokenRepository;
        this.testCaseRepository = testCaseRepository;
        this.webhookLogRepository = webhookLogRepository;
    }

    @Transactional
    public ApiTokenDto createToken(Long projectId, String name) {
        String rawToken = "tree_" + UUID.randomUUID().toString().replace("-", "");
        TreeifyApiToken token = new TreeifyApiToken();
        token.setProjectId(projectId);
        token.setToken(rawToken);
        token.setName(name);
        token.setActive(true);
        token.setCreatedAt(LocalDateTime.now());
        TreeifyApiToken saved = tokenRepository.save(token);
        return toDto(saved, rawToken);
    }

    @Transactional(readOnly = true)
    public List<ApiTokenDto> listTokens(Long projectId) {
        return tokenRepository.findAllByProjectIdOrderByIdDesc(projectId)
                .stream()
                .map(t -> toDto(t, maskToken(t.getToken())))
                .toList();
    }

    @Transactional
    public void revokeToken(Long tokenId) {
        TreeifyApiToken token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "Token 不存在: " + tokenId));
        token.setActive(false);
        tokenRepository.save(token);
    }

    @Transactional(readOnly = true)
    public TreeifyApiToken validateToken(String tokenValue) {
        return tokenRepository.findByTokenAndActiveTrue(tokenValue)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.UNAUTHORIZED, "无效或已撤销的 Token"));
    }

    @Transactional
    public CiExecutionResponse processExecutionResults(String tokenValue, CiExecutionPayload payload) {
        TreeifyApiToken token = validateToken(tokenValue);
        token.setLastUsedAt(LocalDateTime.now());
        tokenRepository.save(token);

        List<CiCaseResult> results = payload.results();
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (CiCaseResult result : results) {
            try {
                Optional<TreeifyTestCase> caseOpt = testCaseRepository.findById(result.caseId());
                if (caseOpt.isPresent()) {
                    TreeifyTestCase tc = caseOpt.get();
                    tc.setExecutionStatus(result.status());
                    tc.setUpdatedAt(LocalDateTime.now());
                    testCaseRepository.save(tc);
                    updated++;
                } else {
                    errors.add("Case not found: " + result.caseId());
                    failed++;
                }
            } catch (Exception e) {
                errors.add("Case " + result.caseId() + ": " + e.getMessage());
                failed++;
            }
        }

        // Log webhook call
        TreeifyWebhookLog webhookLog = new TreeifyWebhookLog();
        webhookLog.setTokenId(token.getId());
        webhookLog.setEndpoint("/api/v1/ci/execution-results");
        webhookLog.setPayload(truncate(results.toString(), 10000));
        webhookLog.setStatusCode(200);
        webhookLog.setError(errors.isEmpty() ? null : String.join("; ", errors));
        webhookLog.setCreatedAt(LocalDateTime.now());
        webhookLogRepository.save(webhookLog);

        return new CiExecutionResponse(updated, failed, results.size());
    }

    public void logWebhookCall(Long tokenId, String endpoint, String payload, Integer statusCode, String error) {
        TreeifyWebhookLog webhookLog = new TreeifyWebhookLog();
        webhookLog.setTokenId(tokenId);
        webhookLog.setEndpoint(endpoint);
        webhookLog.setPayload(truncate(payload, 10000));
        webhookLog.setStatusCode(statusCode);
        webhookLog.setError(error);
        webhookLog.setCreatedAt(LocalDateTime.now());
        webhookLogRepository.save(webhookLog);
    }

    private static String maskToken(String token) {
        if (token == null || token.length() < 12) return "****";
        return "tree_" + "****" + token.substring(token.length() - 4);
    }

    private static ApiTokenDto toDto(TreeifyApiToken entity, String displayToken) {
        return new ApiTokenDto(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                displayToken,
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getLastUsedAt()
        );
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "...";
    }
}
