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
}