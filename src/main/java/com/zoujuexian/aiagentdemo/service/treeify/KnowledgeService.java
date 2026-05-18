package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.CreateKnowledgeRequest;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.KnowledgeDocumentDto;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyKnowledgeDocument;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyKnowledgeDocumentRepository;
import com.zoujuexian.aiagentdemo.service.treeify.agent.JsonOutputParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class KnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeService.class);

    private final TreeifyKnowledgeDocumentRepository knowledgeRepo;
    private final TreeifyPersistenceService persistence;
    private final VectorEmbeddingService vectorEmbeddingService;

    public KnowledgeService(TreeifyKnowledgeDocumentRepository knowledgeRepo,
                            TreeifyPersistenceService persistence,
                            @Autowired(required = false) VectorEmbeddingService vectorEmbeddingService) {
        this.knowledgeRepo = knowledgeRepo;
        this.persistence = persistence;
        this.vectorEmbeddingService = vectorEmbeddingService;
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
        // Embed into vector store if available
        if (vectorEmbeddingService != null) {
            vectorEmbeddingService.embedAndStore(projectId, doc.getId(), request.content(), request.title());
        }
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
        // Clean up vector embeddings before deleting the document
        if (vectorEmbeddingService != null) {
            try {
                vectorEmbeddingService.deleteByKnowledgeId(documentId);
            } catch (Exception e) {
                log.warn("Failed to delete vector embeddings for document {}: {}", documentId, e.getMessage());
            }
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
        List<String> terms = Arrays.stream(keyword.split("[,\\s]+"))
                .map(String::trim)
                .filter(t -> !t.isBlank())
                .toList();
        if (terms.isEmpty()) return List.of();

        // Search per term, deduplicate by ID
        return terms.stream()
                .flatMap(term -> knowledgeRepo.searchByKeyword(projectId, term).stream())
                .collect(Collectors.toMap(
                        TreeifyKnowledgeDocument::getId,
                        d -> d,
                        (a, b) -> a))
                .values().stream()
                .limit(maxResults)
                .map(this::toDto)
                .toList();
    }

    /** Build RAG context string. Tries vector search first, falls back to keyword search. */
    public String buildRagContext(Long projectId, String query, int maxTokens) {
        if (query == null || query.isBlank()) return "";

        // Try vector search first
        if (vectorEmbeddingService != null) {
            try {
                List<String> chunks = vectorEmbeddingService.search(projectId, query, 5);
                if (!chunks.isEmpty()) {
                    StringBuilder sb = new StringBuilder("参考资料（语义检索）：\n");
                    int charBudget = maxTokens * 2;
                    for (int i = 0; i < chunks.size(); i++) {
                        String entry = "- %s\n".formatted(JsonOutputParser.truncate(chunks.get(i), 300));
                        if (sb.length() + entry.length() > charBudget) break;
                        sb.append(entry);
                    }
                    return sb.toString();
                }
            } catch (Exception e) {
                log.warn("Vector search failed, falling back to keyword search: {}", e.getMessage());
            }
        }

        // Fallback: keyword search
        List<KnowledgeDocumentDto> results = search(projectId, query, 5);
        if (results.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("参考资料：\n");
        int charBudget = maxTokens * 2; // rough estimate: 1 token ≈ 2 chars
        for (KnowledgeDocumentDto doc : results) {
            String entry = "- [%s] %s: %s\n".formatted(
                    doc.source() != null ? doc.source() : "知识库",
                    doc.title(),
                    JsonOutputParser.truncate(doc.content(), 300)
            );
            if (sb.length() + entry.length() > charBudget) break;
            sb.append(entry);
        }
        return sb.toString();
    }

    private KnowledgeDocumentDto toDto(TreeifyKnowledgeDocument e) {
        return new KnowledgeDocumentDto(e.getId(), e.getProjectId(), e.getTitle(), e.getContent(), e.getSource(), e.getCreatedAt());
    }
}
