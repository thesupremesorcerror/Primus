package com.primus.core.knowledge;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class EmbeddingClient {

    private final RestClient restClient;
    private final String apiKey;

    public EmbeddingClient(@Value("${primus.gemini.api-key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    @SuppressWarnings("unchecked")
    public List<Double> embed(String text) {
        Map<String, Object> requestBody = Map.of(
                "content", Map.of(
                        "parts", List.of(Map.of("text", text))
                )
        );

        Map<String, Object> response = restClient.post()
                .uri("/models/gemini-embedding-001:embedContent")
                .header("X-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        Map<String, Object> embedding = (Map<String, Object>) response.get("embedding");
        return (List<Double>) embedding.get("values");
    }
}