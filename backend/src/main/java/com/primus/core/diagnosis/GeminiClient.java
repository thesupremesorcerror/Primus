package com.primus.core.diagnosis;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private static final long MIN_INTERVAL_MS = 4500; // ~13 req/min, safely under 15/min free tier cap
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 1000;

    private volatile long lastCallTime = 0;

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

    private synchronized void throttle() {
        long now = System.currentTimeMillis();
        long elapsed = now - lastCallTime;
        if (elapsed < MIN_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_INTERVAL_MS - elapsed);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        lastCallTime = System.currentTimeMillis();
    }

    /**
     * Calls Gemini with the existing fixed-interval pacing throttle (keeps
     * us under the free-tier requests-per-minute cap), plus exponential
     * backoff retry specifically for transient failures: 429 (rate limit
     * burst, distinct from a daily quota exhaustion which returns the same
     * code but won't be fixed by retrying) and 503 (upstream temporarily
     * unavailable). Other error codes (e.g. 400 bad request, 401/403 auth)
     * are not retried since retrying won't help.
     */
    private Map<String, Object> callGemini(Map<String, Object> requestBody) {
        int attempt = 0;
        long backoff = INITIAL_BACKOFF_MS;

        while (true) {
            throttle();
            try {
                return restClient.post()
                        .uri("/models/gemini-3.1-flash-lite:generateContent")
                        .header("X-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(Map.class);
            } catch (RestClientResponseException e) {
                HttpStatusCode status = e.getStatusCode();
                boolean retryable = status.value() == 429 || status.value() == 503;

                if (!retryable || attempt >= MAX_RETRIES) {
                    throw e;
                }

                attempt++;
                System.out.println("[GEMINI] " + status.value() + " on attempt " + attempt
                        + ", backing off " + backoff + "ms before retry");
                try {
                    Thread.sleep(backoff);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
                backoff *= 2; // exponential: 1s, 2s, 4s
            }
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }
}
