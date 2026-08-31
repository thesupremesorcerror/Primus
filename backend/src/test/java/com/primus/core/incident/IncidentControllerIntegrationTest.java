package com.primus.core.incident;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class IncidentControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    private String getAuthToken() {
        // Register a unique test user, then log in, to get a valid JWT
        String uniqueUsername = "testuser_" + System.currentTimeMillis();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String registerBody = String.format(
                "{\"username\":\"%s\",\"password\":\"testpass123\",\"role\":\"ADMIN\"}", uniqueUsername);
        restTemplate.postForEntity(baseUrl() + "/api/auth/register",
                new HttpEntity<>(registerBody, headers), String.class);

        String loginBody = String.format(
                "{\"username\":\"%s\",\"password\":\"testpass123\"}", uniqueUsername);
        ResponseEntity<LoginResponse> loginResponse = restTemplate.postForEntity(
                baseUrl() + "/api/auth/login",
                new HttpEntity<>(loginBody, headers),
                LoginResponse.class);

        return loginResponse.getBody().token();
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void healthEndpointIsPubliclyAccessible() {
        ResponseEntity<String> response = restTemplate.getForEntity(baseUrl() + "/api/health", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void incidentsEndpointRequiresAuthentication() {
        ResponseEntity<String> response = restTemplate.getForEntity(baseUrl() + "/api/incidents", String.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void canCreateAndRetrieveAnIncident() {
        String token = getAuthToken();
        HttpHeaders headers = authHeaders(token);

        String createBody = "{\"title\":\"Test incident from integration test\",\"severity\":\"LOW\",\"affectedService\":\"test-service\"}";
        ResponseEntity<Incident> createResponse = restTemplate.postForEntity(
                baseUrl() + "/api/incidents",
                new HttpEntity<>(createBody, headers),
                Incident.class);

        assertEquals(HttpStatus.OK, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        assertEquals("OPEN", createResponse.getBody().getStatus());

        String incidentId = createResponse.getBody().getId().toString();

        ResponseEntity<Incident> getResponse = restTemplate.exchange(
                baseUrl() + "/api/incidents/" + incidentId,
                org.springframework.http.HttpMethod.GET,
                new HttpEntity<>(headers),
                Incident.class);

        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        assertEquals("Test incident from integration test", getResponse.getBody().getTitle());
    }

    private record LoginResponse(String token, String username, String role) {
    }
}