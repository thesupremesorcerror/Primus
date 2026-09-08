package com.primus.core.observability;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulate")
public class FaultSimulatorController {

    private static final List<String> KNOWN_SERVICES =
            List.of("auth-api", "checkout-api", "payment-api", "orders-api");

    private final FaultSimulator faultSimulator;

    public FaultSimulatorController(FaultSimulator faultSimulator) {
        this.faultSimulator = faultSimulator;
    }

    @PostMapping("/kill/{serviceName}")
    public String kill(@PathVariable String serviceName,
                        @RequestParam(required = false) FaultType faultType) {
        FaultType assigned = faultSimulator.kill(serviceName, faultType);
        return serviceName + " marked as DOWN (" + assigned + ")";
    }

    @PostMapping("/heal/{serviceName}")
    public String heal(@PathVariable String serviceName) {
        faultSimulator.heal(serviceName);
        return serviceName + " marked as HEALTHY";
    }

    /**
     * Lists the known simulated services and their current health, for the
     * frontend's infrastructure map. Backed directly by FaultSimulator's
     * real state -- no invented topology or fake dependency graph.
     */
    @GetMapping("/services")
    public List<Map<String, Object>> listServices() {
        return KNOWN_SERVICES.stream()
                .map(name -> Map.<String, Object>of(
                        "name", name,
                        "healthy", faultSimulator.isHealthy(name),
                        "faultType", faultSimulator.getFaultType(name)
                ))
                .toList();
    }
}
