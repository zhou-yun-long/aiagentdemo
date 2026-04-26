package com.zoujuexian.aiagentdemo.service.rag;

import com.zoujuexian.aiagentdemo.service.rag.chunk.ChunkSplitter;
import com.zoujuexian.aiagentdemo.service.rag.chunk.definite.TextSplitter;
import com.zoujuexian.aiagentdemo.service.rag.retrieve.impl.Bm25Retriever;
import com.zoujuexian.aiagentdemo.service.rag.retrieve.MultiRetriever;
import com.zoujuexian.aiagentdemo.service.rag.retrieve.impl.QueryRewriteRetriever;
import com.zoujuexian.aiagentdemo.service.rag.retrieve.Retriever;
import com.zoujuexian.aiagentdemo.service.rag.retrieve.impl.SemanticRetriever;
import com.zoujuexian.aiagentdemo.service.rag.rerank.LlmReranker;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * RAG 服务封装
 * <p>
 * 优先使用 Embedding + 向量检索方案；如 Embedding 不可用或接口不支持，
 * 自动降级为「长上下文模式」，直接将完整知识文本注入 Prompt，利用 V4 模型长上下文能力。
 */
@Component
public class RagService {

    private static final String KNOWLEDGE_DIR = "knowledge";

    /** 文本分块大小（字符数） */
    private static final int CHUNK_SIZE = 500;

    /** 相邻块重叠字符数 */
    private static final int CHUNK_OVERLAP = 50;

    /** 多路召回候选数量 */
    private static final int RECALL_CANDIDATE_COUNT = 9;

    /** 最终送入 Prompt 的文档块数量 */
    private static final int TOP_K = 3;

    private VectorStore vectorStore;
    private ChunkSplitter chunkSplitter;
    private MultiRetriever multiRecaller;
    private LlmReranker llmReranker;

    private boolean knowledgeLoaded = false;

    /** 降级模式：长上下文直通，跳过向量检索 */
    private boolean useLongContextFallback = false;

    /** 降级模式下缓存的知识全文 */
    private String knowledgeRawText;

    public RagService(
            EmbeddingModel embeddingModel,
            ChatClient chatClient,
            @Value("${spring.ai.openai.base-url}") String baseUrl,
            @Value("${spring.ai.openai.api-key}") String apiKey,
            @Value("${rag.enabled:true}") boolean ragEnabled,
            @Value("${rag.rerank.path:/rerank}") String rerankPath,
            @Value("${rag.rerank.model:rerank}") String rerankModel) {
        this.vectorStore = new VectorStore(embeddingModel);
        this.chunkSplitter = new TextSplitter(CHUNK_SIZE, CHUNK_OVERLAP);
        this.llmReranker = new LlmReranker(baseUrl, apiKey, rerankPath, rerankModel);

        if (!ragEnabled) {
            System.out.println("[RAG] 已通过配置关闭启动加载。");
            return;
        }

        try {
            loadKnowledgeBase(KNOWLEDGE_DIR);

            // 初始化多路召回器
            List<Retriever> retrievers = List.of(
                    new SemanticRetriever(vectorStore),
                    new Bm25Retriever(vectorStore),
                    new QueryRewriteRetriever(vectorStore, chatClient)
            );
            this.multiRecaller = new MultiRetriever(retrievers);
        } catch (Exception e) {
            System.out.println("[RAG] 知识库加载失败（可能是 Embedding 不可用）: " + e.getMessage());
            System.out.println("[RAG] 尝试降级为长上下文模式...");
            try {
                loadKnowledgeRaw(KNOWLEDGE_DIR);
            } catch (Exception ex) {
                System.out.println("[RAG] 降级也失败，RAG 功能已禁用: " + ex.getMessage());
            }
        }
    }

    /**
     * 不带 Embedding 地读取知识库原始文本（长上下文降级方案）
     */
    private void loadKnowledgeRaw(String knowledgeDir) throws IOException, URISyntaxException {
        URL resourceUrl = getClass().getClassLoader().getResource(knowledgeDir);
        if (resourceUrl == null) {
            throw new IOException("知识库目录不存在: " + knowledgeDir);
        }

        Path dirPath = Paths.get(resourceUrl.toURI());
        List<Path> textFiles = Files.list(dirPath)
                .filter(path -> path.toString().endsWith(".txt"))
                .toList();

        if (textFiles.isEmpty()) {
            throw new IOException("知识库目录中没有找到 .txt 文件: " + knowledgeDir);
        }

        System.out.println("=== 加载知识库（长上下文模式）===");
        System.out.println("发现 " + textFiles.size() + " 个知识库文件\n");

        StringBuilder allContent = new StringBuilder();
        for (Path filePath : textFiles) {
            String fileName = filePath.getFileName().toString();
            String content = Files.readString(filePath, StandardCharsets.UTF_8);
            System.out.println("正在加载文件: " + fileName + "（" + content.length() + " 字符）");
            allContent.append("【").append(fileName).append("】\n");
            allContent.append(content).append("\n\n");
        }

        this.knowledgeRawText = allContent.toString().trim();
        this.useLongContextFallback = true;
        this.knowledgeLoaded = true;
        System.out.println("知识库加载完成（长上下文模式，共 " + knowledgeRawText.length() + " 字符）。\n");
    }

    /**
     * 加载知识库目录下的所有 .txt 文件
     *
     * @param knowledgeDir 知识库目录路径（相对于 classpath resources）
     */
    public void loadKnowledgeBase(String knowledgeDir) throws IOException, URISyntaxException {
        URL resourceUrl = getClass().getClassLoader().getResource(knowledgeDir);
        if (resourceUrl == null) {
            throw new IOException("知识库目录不存在: " + knowledgeDir);
        }

        Path dirPath = Paths.get(resourceUrl.toURI());
        List<Path> textFiles = Files.list(dirPath)
                .filter(path -> path.toString().endsWith(".txt"))
                .toList();

        if (textFiles.isEmpty()) {
            throw new IOException("知识库目录中没有找到 .txt 文件: " + knowledgeDir);
        }

        System.out.println("=== 加载知识库 ===");
        System.out.println("发现 " + textFiles.size() + " 个知识库文件\n");

        for (Path filePath : textFiles) {
            String fileName = filePath.getFileName().toString();
            String content = Files.readString(filePath, StandardCharsets.UTF_8);
            System.out.println("正在处理文件: " + fileName + "（" + content.length() + " 字符）");

            List<Document> chunks = chunkSplitter.split(content, fileName);
            System.out.println(chunkSplitter.name() + "完成，共 " + chunks.size() + " 个文本块");

            vectorStore.addDocuments(chunks);
        }

        knowledgeLoaded = true;
        System.out.println("知识库加载完成。\n");
    }

    /**
     * 检索知识库中与问题最相关的文档内容
     * <p>
     * 向量检索模式：多路召回 → LLM 重排 → 拼接上下文
     * 长上下文模式：直接返回完整知识文本
     *
     * @param question 用户问题
     * @return 检索到的相关知识文本
     */
    public String query(String question) {
        if (!knowledgeLoaded) {
            return "知识库尚未加载，请先调用 loadKnowledgeBase 加载知识库。";
        }

        // 降级模式：直接返回全部知识文本，靠长上下文模型处理
        if (useLongContextFallback) {
            return "以下是从知识库中检索到的相关参考资料，请结合这些资料回答用户的问题：\n\n"
                    + knowledgeRawText;
        }

        // 1. 多路召回
        List<Document> candidates = multiRecaller.retrieve(question, RECALL_CANDIDATE_COUNT);
        if (candidates.isEmpty()) {
            return "知识库中没有找到与问题相关的内容。";
        }

        // 2. LLM 重排
        List<Document> relevantDocuments = llmReranker.rerank(question, candidates, TOP_K);

        // 3. 拼接上下文
        StringBuilder contextBuilder = new StringBuilder();
        for (int i = 0; i < relevantDocuments.size(); i++) {
            contextBuilder.append("【参考资料 ").append(i + 1).append("】\n");
            contextBuilder.append(relevantDocuments.get(i).getContent());
            contextBuilder.append("\n\n");
        }

        return contextBuilder.toString().trim();
    }

    /**
     * 知识库是否已加载
     */
    public boolean isKnowledgeLoaded() {
        return knowledgeLoaded;
    }

}
