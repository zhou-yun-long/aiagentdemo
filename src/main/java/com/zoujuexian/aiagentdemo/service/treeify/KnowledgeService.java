package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateKnowledgeRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.KnowledgeDocumentDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyKnowledgeDocument;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyKnowledgeDocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class KnowledgeService {

    private final TreeifyKnowledgeDocumentRepository knowledgeRepo;
    private final TreeifyPersistenceService persistence;

    public KnowledgeService(TreeifyKnowledgeDocumentRepository knowledgeRepo,
                            TreeifyPersistenceService persistence) {
        this.knowledgeRepo = knowledgeRepo;
        this.persistence = persistence;
    }

    /** Add a knowledge document. */
    @Transactional
    public KnowledgeDocumentDto addDocument(Long projectId, CreateKnowledgeRequest request) {
        persistence.findProject(projectId);
        TreeifyKnowledgeDocument doc = new TreeifyKnowledgeDocument(
                projectId,
                request.title(),
                request.content(),
                request.source()
        );
        knowledgeRepo.save(doc);
        return toDto(doc);
    }

    /** List all knowledge documents for a project. */
    public List<KnowledgeDocumentDto> listDocuments(Long projectId) {
        persistence.findProject(projectId);
        return knowledgeRepo.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    /** Delete a knowledge document. */
    @Transactional
    public void deleteDocument(Long documentId) {
        if (!knowledgeRepo.existsById(documentId)) {
            throw new IllegalArgumentException("Knowledge document not found: " + documentId);
        }
        knowledgeRepo.deleteById(documentId);
    }

    /** Search knowledge documents by keyword. Returns top N results with content truncated. */
    public List<KnowledgeDocumentDto> search(Long projectId, String keyword, int maxResults) {
        persistence.findProject(projectId);
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        // Extract search terms (split by spaces, commas)
        String[] terms = keyword.split("[,\\s]+");
        List<TreeifyKnowledgeDocument> allMatches = new java.util.ArrayList<>();
        for (String term : terms) {
            if (!term.isBlank()) {
                allMatches.addAll(knowledgeRepo.searchByKeyword(projectId, term.trim()));
            }
        }
        // Deduplicate and limit
        return allMatches.stream()
                .collect(java.util.stream.Collectors.toMap(
                        TreeifyKnowledgeDocument::getId,
                        d -> d,
                        (a, b) -> a,
                        java.util.LinkedHashMap::new
                ))
                .values().stream()
                .limit(maxResults)
                .map(this::toDto)
                .toList();
    }

    /** Build RAG context string from keyword search results. */
    public String buildRagContext(Long projectId, String query, int maxTokens) {
        if (query == null || query.isBlank()) return "";
        List<KnowledgeDocumentDto> results = search(projectId, query, 5);
        if (results.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("参考资料：\n");
        int charBudget = maxTokens * 2; // rough estimate: 1 token ≈ 2 chars
        for (KnowledgeDocumentDto doc : results) {
            String entry = "- [%s] %s: %s\n".formatted(
                    doc.source() != null ? doc.source() : "知识库",
                    doc.title(),
                    truncate(doc.content(), 300)
            );
            if (sb.length() + entry.length() > charBudget) break;
            sb.append(entry);
        }
        return sb.toString();
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "...";
    }

    private KnowledgeDocumentDto toDto(TreeifyKnowledgeDocument e) {
        return new KnowledgeDocumentDto(e.getId(), e.getProjectId(), e.getTitle(), e.getContent(), e.getSource(), e.getCreatedAt());
    }
}
