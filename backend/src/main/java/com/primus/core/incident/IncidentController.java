package com.primus.core.incident;

import com.primus.core.agent.AgentFinding;
import com.primus.core.agent.DiagnosticTools;
import com.primus.core.agent.FindingsCache;
import com.primus.core.agent.Orchestrator;
import com.primus.core.memory.IncidentMemoryService;
import com.primus.core.remediation.RemediationCandidate;
import com.primus.core.remediation.RemediationCandidateService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final com.primus.core.diagnosis.DiagnosisService diagnosisService;
    private final Orchestrator orchestrator;
    private final IncidentMemoryService incidentMemoryService;
    private final RemediationCandidateService candidateService;
    private final DiagnosticTools diagnosticTools;
    private final FindingsCache findingsCache;

    public IncidentController(IncidentRepository incidentRepository,
                              com.primus.core.diagnosis.DiagnosisService diagnosisService,
                              Orchestrator orchestrator,
                              IncidentMemoryService incidentMemoryService,
                              RemediationCandidateService candidateService,
                              DiagnosticTools diagnosticTools,
                              FindingsCache findingsCache) {
        this.incidentRepository = incidentRepository;
        this.diagnosisService = diagnosisService;
        this.orchestrator = orchestrator;
        this.incidentMemoryService = incidentMemoryService;
        this.candidateService = candidateService;
        this.diagnosticTools = diagnosticTools;
        this.findingsCache = findingsCache;
    }

    @GetMapping
    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    @GetMapping("/{id}")
    public Incident getIncident(@PathVariable UUID id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not found: " + id));
    }

    @PostMapping("/{id}/diagnose")
    public Incident diagnoseIncident(@PathVariable UUID id) {
        return diagnosisService.diagnose(id);
    }

    @PostMapping
    public Incident createIncident(@RequestBody CreateIncidentRequest request) {
        Incident incident = new Incident(
                request.title(),
                request.severity(),
                "OPEN",
                request.affectedService()
        );
        return incidentRepository.save(incident);
    }

    @PostMapping("/{id}/investigate")
    public Incident investigateIncident(@PathVariable UUID id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not found: " + id));

        Orchestrator.OrchestratorResult result = orchestrator.run(incident);

        findingsCache.store(incident.getId(), result.findings);

        incident.setRootCauseGuess(result.diagnosis);

        if (result.approvalRequired) {
            incident.setStatus("AWAITING_APPROVAL");
        } else if (result.actionTaken != null && result.verified) {
            incident.setStatus("RESOLVED");
            incident.setResolvedAt(Instant.now());
            incidentMemoryService.storeResolvedIncident(incident, result.actionTaken);
        } else if (result.actionTaken != null) {
            incident.setStatus("REOPENED");
        } else {
            incident.setStatus("DIAGNOSING");
        }

        return incidentRepository.save(incident);
    }

    @GetMapping("/{id}/candidates")
    public List<RemediationCandidate> getCandidates(@PathVariable UUID id) {
        return candidateService.getCandidatesForIncident(id);
    }

    /**
     * Returns a live snapshot of metrics and recent logs for the incident's
     * affected service, using the same DiagnosticTools the agents themselves
     * call during investigation. Lets the frontend show what evidence the
     * agents are working from, without inventing or caching separate data.
     */
    @GetMapping("/{id}/diagnostics")
    public Map<String, Object> getDiagnostics(@PathVariable UUID id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not found: " + id));

        String serviceName = incident.getAffectedService();
        Map<String, Object> metrics = diagnosticTools.getMetrics(serviceName);
        Map<String, Object> logsResult = diagnosticTools.getLogs(serviceName);

        return Map.of(
                "serviceName", serviceName,
                "metrics", metrics,
                "logs", logsResult.get("recentLogs")
        );
    }

    /**
     * Deletes all incidents created by eval runs (title starts with "[EVAL]").
     * Admin-only housekeeping endpoint — lets production stay clean for demos
     * after running the eval harness, without touching manually-created or
     * fault-simulator-detected incidents.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/eval-cleanup")
    public Map<String, Object> cleanupEvalIncidents() {
        List<Incident> toDelete = incidentRepository.findAll().stream()
                .filter(i -> i.getTitle().startsWith("[EVAL]"))
                .toList();
        incidentRepository.deleteAll(toDelete);
        return Map.of("deletedCount", toDelete.size());
    }

    /**
     * Returns the evidence each specialist agent (LogAgent, MetricsAgent,
     * RagAgent) gathered during the incident's most recent investigation --
     * real AgentFinding data from that run, not re-derived or invented.
     * Empty if the incident hasn't been investigated yet in this app session.
     */
    @GetMapping("/{id}/evidence")
    public List<AgentFinding> getEvidence(@PathVariable UUID id) {
        return findingsCache.get(id);
    }

    @PreAuthorize("hasAnyRole('APPROVER', 'ADMIN')")
    @PostMapping("/{id}/approve/{candidateId}")
    public Incident approveCandidate(@PathVariable UUID id, @PathVariable UUID candidateId) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not found: " + id));
        RemediationCandidate candidate = candidateService.getCandidate(candidateId);

        Object toolResult = switch (candidate.getActionType()) {
            case "restart_service" -> diagnosticTools.restartService(candidate.getServiceName());
            case "rollback_deployment" -> diagnosticTools.rollbackDeployment(candidate.getServiceName());
            case "scale_service" -> diagnosticTools.scaleService(candidate.getServiceName());
            default -> throw new RuntimeException("Unknown action type: " + candidate.getActionType());
        };

        candidateService.updateStatus(candidateId, "EXECUTED");

        boolean healthy = diagnosticTools.checkServiceHealth(candidate.getServiceName());
        String actionTaken = candidate.getActionType() + "(" + candidate.getServiceName() + ")";

        if (healthy) {
            incident.setStatus("RESOLVED");
            incident.setResolvedAt(Instant.now());
            incidentMemoryService.storeResolvedIncident(incident, actionTaken);
        } else {
            incident.setStatus("REOPENED");
        }

        return incidentRepository.save(incident);
    }

    @PreAuthorize("hasAnyRole('APPROVER', 'ADMIN')")
    @PostMapping("/{id}/reject/{candidateId}")
    public Incident rejectCandidate(@PathVariable UUID id, @PathVariable UUID candidateId) {
        candidateService.updateStatus(candidateId, "REJECTED");

        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not found: " + id));
        incident.setStatus("DIAGNOSING");
        return incidentRepository.save(incident);
    }

    public record CreateIncidentRequest(String title, String severity, String affectedService) {
    }
}
