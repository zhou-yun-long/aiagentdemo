package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.ApiTokenDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CiExecutionPayload;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CiExecutionResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.ci.CreateTokenRequest;
import com.zoujuexian.aiagentdemo.service.treeify.CiIntegrationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class CiController {

    private final CiIntegrationService ciIntegrationService;

    public CiController(CiIntegrationService ciIntegrationService) {
        this.ciIntegrationService = ciIntegrationService;
    }

    @PostMapping("/projects/{projectId}/tokens")
    public ApiResponse<ApiTokenDto> createToken(@PathVariable Long projectId,
                                                @RequestBody CreateTokenRequest request) {
        return ApiResponse.ok(ciIntegrationService.createToken(projectId, request.name()));
    }

    @GetMapping("/projects/{projectId}/tokens")
    public ApiResponse<List<ApiTokenDto>> listTokens(@PathVariable Long projectId) {
        return ApiResponse.ok(ciIntegrationService.listTokens(projectId));
    }

    @DeleteMapping("/tokens/{tokenId}")
    public ApiResponse<Void> revokeToken(@PathVariable Long tokenId) {
        ciIntegrationService.revokeToken(tokenId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/ci/execution-results")
    public ApiResponse<CiExecutionResponse> executionResults(@RequestBody CiExecutionPayload payload,
                                                             HttpServletRequest request) {
        String token = extractBearerToken(request);
        CiExecutionResponse response = ciIntegrationService.processExecutionResults(token, payload);
        return ApiResponse.ok(response);
    }

    private static String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return "";
    }
}
