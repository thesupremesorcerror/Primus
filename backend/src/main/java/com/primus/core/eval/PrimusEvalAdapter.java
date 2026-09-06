package com.primus.core.eval;

import com.primus.core.agent.AgentLoop;
import com.primus.core.agent.DiagnosticTools;
import com.primus.core.agent.Orchestrator;
import com.primus.core.incident.Incident;
import com.primus.core.observability.FaultType;
import com.primus.core.remediation.RemediationCandidate;
import com.primus.core.remediation.RemediationCandidateService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class PrimusEvalAdapter {

    private final AgentLoop agentLoop;
    private final Orchestrator orchestrator;
    private final DiagnosticTools diagnosticTools;
    private final RemediationCandidateService candidateService;

    public PrimusEvalAdapter(AgentLoop agentLoop, Orchestrator orchestrator,
                             DiagnosticTools diagnosticTools, RemediationCandidateService candidateService) {
        this.agentLoop = agentLoop;
        this.orchestrator = orchestrator;
        this.diagnosticTools = diagnosticTools;
        this.candidateService = candidateService;
    }

    public EvalResult runSingleAgent(Incident incident, FaultType groundTruth) {
        AgentLoop.AgentResult result = agentLoop.diagnose(incident);
        String proposedAction = extractActionName(result.actionTaken);
        boolean resolved = result.verified;

        if (proposedAction == null && result.approvalRequired) {
            proposedAction = recommendedCandidateAction(incident.getId());
            resolved = false;
        }

        return new EvalResult("single_agent_primus", incident.getAffectedService(),
                scenarioLabel(groundTruth), result.diagnosis, proposedAction == null ? "none" : proposedAction,
                resolved, 0, 0L);
    }

    public EvalResult runMultiAgent(Incident incident, FaultType groundTruth) {
        Orchestrator.OrchestratorResult result = orchestrator.run(incident);
        String proposedAction = extractActionName(result.actionTaken);
        boolean resolved = result.verified;

        if (proposedAction == null && result.approvalRequired) {
            proposedAction = recommendedCandidateAction(incident.getId());
            resolved = false;
        }

        return new EvalResult("multi_agent_primus", incident.getAffectedService(),
                scenarioLabel(groundTruth), result.diagnosis, proposedAction == null ? "none" : proposedAction,
                resolved, 0, 0L);
    }

    private String extractActionName(String actionTaken) {
        if (actionTaken == null) return null;
        int parenIdx = actionTaken.indexOf('(');
        return parenIdx == -1 ? actionTaken : actionTaken.substring(0, parenIdx);
    }

    private String recommendedCandidateAction(UUID incidentId) {
        List<RemediationCandidate> candidates = candidateService.getCandidatesForIncident(incidentId);
        return candidates.stream()
                .filter(c -> Boolean.TRUE.equals(c.getRecommended()))
                .findFirst()
                .map(RemediationCandidate::getActionType)
                .orElse("none");
    }

    private String scenarioLabel(FaultType faultType) {
        return switch (faultType) {
            case DEPLOYMENT_ISSUE -> "BAD_DEPLOYMENT";
            case CONNECTION_POOL_EXHAUSTION -> "CONNECTION_POOL";
            case TRANSIENT_GLITCH -> "TRANSIENT_GLITCH";
            case NONE -> "UNKNOWN";
        };
    }
}