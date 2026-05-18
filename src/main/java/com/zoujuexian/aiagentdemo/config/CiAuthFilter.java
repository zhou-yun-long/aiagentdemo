package com.zoujuexian.aiagentdemo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyApiToken;
import com.zoujuexian.aiagentdemo.service.treeify.CiIntegrationService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * CI/CD authentication filter. Registered via {@link CiFilterConfig} for
 * {@code /api/v1/ci/*} paths only. Not annotated with {@code @Component}
 * to avoid double-registration from both component scanning and the
 * {@code FilterRegistrationBean}.
 */
public class CiAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CiAuthFilter.class);

    private final CiIntegrationService ciIntegrationService;
    private final ObjectMapper objectMapper;

    public CiAuthFilter(CiIntegrationService ciIntegrationService, ObjectMapper objectMapper) {
        this.ciIntegrationService = ciIntegrationService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/ci/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "缺少 Authorization 头");
            return;
        }

        String tokenValue = authHeader.substring(7);
        try {
            TreeifyApiToken token = ciIntegrationService.validateToken(tokenValue);
            request.setAttribute("ciProjectId", token.getProjectId());
            request.setAttribute("ciTokenId", token.getId());

            log.info("CI webhook call: token={}, project={}", token.getId(), token.getProjectId());
            filterChain.doFilter(request, response);
        } catch (BusinessException e) {
            log.warn("CI auth failed: {}", e.getMessage());
            sendUnauthorized(response, e.getMessage());
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        ApiResponse<Void> body = ApiResponse.error(ApiErrorCode.UNAUTHORIZED, message);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
