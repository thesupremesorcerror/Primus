package com.primus.core.observability;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Stand-in for real observability data until the Docker test lab exists.
 * Lets us flip a "service" between healthy and down via an API call,
 * so the detection loop has something real to react to.
 */
@Component
public class FaultSimulator {

    private final Map<String, Boolean> serviceHealthy = new ConcurrentHashMap<>();

    public boolean isHealthy(String serviceName) {
        return serviceHealthy.getOrDefault(serviceName, true);
    }

    public void setHealthy(String serviceName, boolean healthy) {
        serviceHealthy.put(serviceName, healthy);
    }
}