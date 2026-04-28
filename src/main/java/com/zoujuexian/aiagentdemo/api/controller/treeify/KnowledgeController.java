package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateKnowledgeRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.KnowledgeDocumentDto;
import com.zoujuexian.aiagentdemo.service.treeify.KnowledgeService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class KnowledgeController {

    private final KnowledgeService knowledgeService;

    public KnowledgeController(KnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @PostMapping("/projects/{projectId}/knowledge")
    public ApiResponse<KnowledgeDocumentDto> addDocument(
            @PathVariable Long projectId,
            @RequestBody CreateKnowledgeRequest request
    ) {
        return ApiResponse.ok(knowledgeService.addDocument(projectId, request));
    }

    @GetMapping("/projects/{projectId}/knowledge")
    public ApiResponse<List<KnowledgeDocumentDto>> listDocuments(@PathVariable Long projectId) {
        return ApiResponse.ok(knowledgeService.listDocuments(projectId));
    }

    @DeleteMapping("/knowledge/{documentId}")
    public ApiResponse<Void> deleteDocument(@PathVariable Long documentId) {
        knowledgeService.deleteDocument(documentId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/projects/{projectId}/knowledge/search")
    public ApiResponse<List<KnowledgeDocumentDto>> search(
            @PathVariable Long projectId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.ok(knowledgeService.search(projectId, keyword, limit));
    }
}
