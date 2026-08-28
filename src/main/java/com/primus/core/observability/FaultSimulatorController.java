package com.primus.core.observability;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulate")
public class FaultSimulatorController {

    private final FaultSimulator faultSimulator;

    public FaultSimulatorController(FaultSimulator faultSimulator) {
        this.faultSimulator = faultSimulator;
    }

    @PostMapping("/kill/{serviceName}")
    public String kill(@PathVariable String serviceName) {
        faultSimulator.setHealthy(serviceName, false);
        return serviceName + " marked as DOWN";
    }

    @PostMapping("/heal/{serviceName}")
    public String heal(@PathVariable String serviceName) {
        faultSimulator.setHealthy(serviceName, true);
        return serviceName + " marked as HEALTHY";
    }
}