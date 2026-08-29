package com.primus.core.diagnosis;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private final RestClient restClient;
    private final String apiKey;

    public GeminiClient(@Value("${primus.gemini.api-key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    public String generateDiagnosis(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                )
        );
        Map<String, Object> response = callGemini(requestBody);
        return extractText(response);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> sendConversation(List<Map<String, Object>> contents, List<Map<String, Object>> tools) {
        Map<String, Object> requestBody = Map.of(
                "contents", contents,
                "tools", List.of(Map.of("functionDeclarations", tools))
        );
        return callGemini(requestBody);
    }

    private Map<String, Object> callGemini(Map<String, Object> requestBody) {
        return restClient.post()
                .uri("/models/gemini-3.1-flash-lite:generateContent")
                .header("X-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map.class);
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }
}