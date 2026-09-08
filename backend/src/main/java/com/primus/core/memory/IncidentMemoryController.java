package com.primus.core.memory;

import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/memory")
public class IncidentMemoryController {

    private final IncidentMemoryService incidentMemoryService;

    public IncidentMemoryController(IncidentMemoryService incidentMemoryService) {
        this.incidentMemoryService = incidentMemoryService;
    }

    /**
     * Slim view of an IncidentMemory row -- deliberately excludes the raw
     * embedding blob, which is internal representation, not something the
     * frontend needs.
     */
    public record MemorySearchResult(
            String summary,
            String rootCause,
            String remediationTaken,
            String outcome,
            Instant createdAt
    ) {}

    @GetMapping("/search")
    public List<MemorySearchResult> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK
    ) {
        return incidentMemoryService.findSimilarCases(query, topK).stream()
                .map(m -> new MemorySearchResult(
                        m.getSummary(),
                        m.getRootCause(),
                        m.getRemediationTaken(),
                        m.getOutcome(),
                        m.getCreatedAt()
                ))
                .toList();
    }
}
