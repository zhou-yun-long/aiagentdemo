package com.zoujuexian.aiagentdemo.service.treeify;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VectorEmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(VectorEmbeddingService.class);

    private static final int TARGET_CHUNK_SIZE = 500;
    private static final int CHUNK_OVERLAP = 50;

    @Autowired(required = false)
    private PgVectorStore vectorStore;

    @Autowired
    private EmbeddingModel embeddingModel;

    /**
     * Splits content into chunks and stores them as vector embeddings.
     */
    public void embedAndStore(Long projectId, Long knowledgeId, String content, String title) {
        if (vectorStore == null) {
            return;
        }
        if (content == null || content.isBlank()) {
            return;
        }

        List<String> chunks = chunkContent(content);
        List<Document> documents = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            Map<String, Object> metadata = Map.of(
                    "projectId", projectId,
                    "knowledgeId", knowledgeId,
                    "title", title != null ? title : "",
                    "chunkIndex", i
            );
            documents.add(new Document(chunks.get(i), metadata));
        }

        log.info("Storing {} embedding chunks for knowledgeId={}, projectId={}", documents.size(), knowledgeId, projectId);
        vectorStore.add(documents);
    }

    /**
     * Splits test case content into chunks and stores them as vector embeddings
     * with type metadata set to "test_case" for cross-project reference.
     */
    public void embedTestCase(Long projectId, Long testCaseId, String content, String title) {
        if (vectorStore == null) {
            return;
        }
        if (content == null || content.isBlank()) {
            return;
        }

        List<String> chunks = chunkContent(content);
        List<Document> documents = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            Map<String, Object> metadata = Map.of(
                    "projectId", projectId,
                    "testCaseId", testCaseId,
                    "title", title != null ? title : "",
                    "chunkIndex", i,
                    "type", "test_case"
            );
            documents.add(new Document(chunks.get(i), metadata));
        }

        log.info("Storing {} embedding chunks for testCaseId={}, projectId={}", documents.size(), testCaseId, projectId);
        vectorStore.add(documents);
    }

    /**
     * Deletes all vector embeddings associated with the given test case.
     */
    public void deleteByTestCaseId(Long testCaseId) {
        if (vectorStore == null) {
            return;
        }

        log.info("Deleting embedding vectors for testCaseId={}", testCaseId);
        Filter.Expression expr = new FilterExpressionBuilder().eq("testCaseId", testCaseId).build();
        vectorStore.delete(expr);
    }

    /**
     * Deletes all vector embeddings associated with the given knowledge document.
     */
    public void deleteByKnowledgeId(Long knowledgeId) {
        if (vectorStore == null) {
            return;
        }

        log.info("Deleting embedding vectors for knowledgeId={}", knowledgeId);
        Filter.Expression expr = new FilterExpressionBuilder().eq("knowledgeId", knowledgeId).build();
        vectorStore.delete(expr);
    }

    /**
     * Searches for content chunks matching the query within a project scope.
     */
    public List<String> search(Long projectId, String query, int topK) {
        if (vectorStore == null) {
            return Collections.emptyList();
        }
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        log.debug("Searching embeddings: projectId={}, query='{}', topK={}", projectId, query, topK);
        Filter.Expression expr = new FilterExpressionBuilder().eq("projectId", projectId).build();
        List<Document> results = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(topK)
                        .filterExpression(expr)
                        .build()
        );

        if (results == null) {
            return Collections.emptyList();
        }

        return results.stream()
                .map(Document::getText)
                .toList();
    }

    /**
     * Splits content into chunks of approximately TARGET_CHUNK_SIZE characters
     * with CHUNK_OVERLAP character overlap between consecutive chunks.
     *
     * Strategy: split by double newlines first (paragraphs), then merge small
     * chunks or split large ones to approach the target size.
     */
    List<String> chunkContent(String content) {
        // First, split by double newline to get paragraphs
        String[] paragraphs = content.split("\\n\\n+");
        List<String> rawChunks = new ArrayList<>();
        for (String paragraph : paragraphs) {
            String trimmed = paragraph.strip();
            if (!trimmed.isEmpty()) {
                rawChunks.add(trimmed);
            }
        }

        if (rawChunks.isEmpty()) {
            // Fallback: treat the whole content as a single chunk
            String stripped = content.strip();
            if (!stripped.isEmpty()) {
                return List.of(stripped);
            }
            return Collections.emptyList();
        }

        // Merge small consecutive chunks and split large ones
        List<String> merged = new ArrayList<>();
        StringBuilder buffer = new StringBuilder();

        for (String chunk : rawChunks) {
            if (buffer.length() + chunk.length() + 2 <= TARGET_CHUNK_SIZE * 1.5) {
                if (buffer.length() > 0) {
                    buffer.append("\n\n");
                }
                buffer.append(chunk);
            } else {
                if (buffer.length() > 0) {
                    merged.add(buffer.toString());
                    buffer.setLength(0);
                }
                // If a single chunk is too large, split it with overlap
                if (chunk.length() > TARGET_CHUNK_SIZE * 1.5) {
                    merged.addAll(splitWithOverlap(chunk, TARGET_CHUNK_SIZE, CHUNK_OVERLAP));
                } else {
                    buffer.append(chunk);
                }
            }
        }
        if (buffer.length() > 0) {
            merged.add(buffer.toString());
        }

        return merged;
    }

    /**
     * Splits a long text into pieces of the given chunk size with overlap.
     */
    private List<String> splitWithOverlap(String text, int chunkSize, int overlap) {
        List<String> result = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            result.add(text.substring(start, end));
            if (end >= text.length()) {
                break;
            }
            start = end - overlap;
        }
        return result;
    }
}
