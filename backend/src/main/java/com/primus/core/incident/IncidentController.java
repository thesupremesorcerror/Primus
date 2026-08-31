package com.primus.core.incident;

import com.primus.core.memory.IncidentMemoryService;
import com.primus.core.remediation.RemediationCandidate;
import com.primus.core.remediation.RemediationCandidateService;
import com.primus.core.agent.DiagnosticTools;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final com.primus.core.diagnosis.DiagnosisService diagnosisService;
    private final com.primus.core.agent.AgentLoop agentLoop;
    private final IncidentMemoryService incidentMemoryService;
    private final RemediationCandidateService candidateService;
    private final DiagnosticTools diagnosticTools;

    public IncidentController(IncidentRepository incidentRepository,
                              com.primus.core.diagnosis.DiagnosisService diagnosisService,
                              com.primus.core.agent.AgentLoop agentLoop,
                              IncidentMemoryService incidentMemoryService,
                              RemediationCandidateService candidateService,
                              DiagnosticTools diagnosticTools) {
        this.incidentRepository = incidentRepository;
        this.diagnosisService = diagnosisService;
        this.agentLoop = agentLoop;
        this.incidentMemoryService = incidentMemoryService;
        this.candidateService = candidateService;
        this.diagnosticTools = diagnosticTools;
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

        com.primus.core.agent.AgentLoop.AgentResult result = agentLoop.diagnose(incident);

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