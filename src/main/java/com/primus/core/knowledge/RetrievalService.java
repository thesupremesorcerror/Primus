package com.primus.core.knowledge;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class RetrievalService {

    private final KbDocumentRepository kbDocumentRepository;
    private final EmbeddingClient embeddingClient;

    public RetrievalService(KbDocumentRepository kbDocumentRepository, EmbeddingClient embeddingClient) {
        this.kbDocumentRepository = kbDocumentRepository;
        this.embeddingClient = embeddingClient;
    }

    public List<KbDocument> findRelevant(String queryText, int topK) {
        var queryEmbedding = embeddingClient.embed(queryText);
        var allDocs = kbDocumentRepository.findAll();

        return allDocs.stream()
                .filter(doc -> doc.getEmbedding() != null)
                .sorted(Comparator.comparingDouble(
                        (KbDocument doc) -> VectorMath.cosineSimilarity(
                                queryEmbedding,
                                EmbeddingSerializer.fromJson(doc.getEmbedding())
                        )
                ).reversed())
                .limit(topK)
                .toList();
    }
}
