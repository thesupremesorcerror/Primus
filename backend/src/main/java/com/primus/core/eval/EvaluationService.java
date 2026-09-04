package com.primus.core.eval;

import com.primus.core.incident.Incident;
import com.primus.core.incident.IncidentRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class EvaluationService {

    private static final List<String> SERVICES =
            List.of("auth-api", "checkout-api", "payment-api", "orders-api");
    private static final int RUNS_PER_SYSTEM = 10;

    private final IncidentRepository incidentRepository;
    private final RuleBasedDiagnoser ruleBasedDiagnoser;
    private final LlmNoRagDiagnoser llmNoRagDiagnoser;
    private final LlmRagDiagnoser llmRagDiagnoser;
    private final PrimusEvalAdapter primusEvalAdapter;

    public EvaluationService(IncidentRepository incidentRepository,
                             RuleBasedDiagnoser ruleBasedDiagnoser,
                             LlmNoRagDiagnoser llmNoRagDiagnoser,
                             LlmRagDiagnoser llmRagDiagnoser,
                             PrimusEvalAdapter primusEvalAdapter) {
        this.incidentRepository = incidentRepository;
        this.ruleBasedDiagnoser = ruleBasedDiagnoser;
        this.llmNoRagDiagnoser = llmNoRagDiagnoser;
        this.llmRagDiagnoser = llmRagDiagnoser;
        this.primusEvalAdapter = primusEvalAdapter;
    }

    public List<EvalSummary> runFullEvaluation() {
        List<EvalSummary> summaries = new ArrayList<>();

        summaries.add(runSystem("rule_based", this::runRuleBased));
        summaries.add(runSystem("llm_no_rag", this::runLlmNoRag));
        summaries.add(runSystem("llm_rag", this::runLlmRag));
        summaries.add(runSystem("single_agent_primus", this::runSingleAgent));
        summaries.add(runSystem("multi_agent_primus", this::runMultiAgent));

        return summaries;
    }

    private EvalSummary runSystem(String name, java.util.function.Function<Incident, EvalResult> runner) {
        List<EvalResult> results = new ArrayList<>();
        for (int i = 0; i < RUNS_PER_SYSTEM; i++) {
            String service = SERVICES.get(i % SERVICES.size());
            Incident incident = createEvalIncident(name, service);
            long start = System.currentTimeMillis();
            EvalResult result = runWithRetry(runner, incident, name, service);
            long elapsed = System.currentTimeMillis() - start;
            results.add(withLatency(result, elapsed));
        }
        return EvalSummary.from(name, results);
    }

    private EvalResult runWithRetry(java.util.function.Function<Incident, EvalResult> runner,
                                    Incident incident, String systemName, String serviceName) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                return runner.apply(incident);
            } catch (Exception e) {
                System.out.println("[EVAL] " + systemName + " attempt " + attempt + " failed for "
                        + serviceName + ": " + e.getMessage());
                if (attempt < 2) {
                    try { Thread.sleep(5000); } catch (InterruptedException ignored) {}
                }
            }
        }
        return new EvalResult(systemName, serviceName, "UNKNOWN",
                "FAILED: exception during eval run", "none", false, 0, 0L);
    }

    private EvalResult withLatency(EvalResult r, long latencyMs) {
        return new EvalResult(r.systemName(), r.serviceName(), r.observedScenario(), r.diagnosis(),
                r.proposedAction(), r.resolved(), r.llmCallCount(), latencyMs);
    }

    private Incident createEvalIncident(String systemName, String serviceName) {
        Incident incident = new Incident(
                "[EVAL] " + serviceName + " is not responding",
                "HIGH",
                "OPEN",
                serviceName
        );
        return incidentRepository.save(incident);
    }

    private EvalResult runRuleBased(Incident incident) {
        return ruleBasedDiagnoser.diagnose(incident.getAffectedService());
    }

    private EvalResult runLlmNoRag(Incident incident) {
        return llmNoRagDiagnoser.diagnose(incident.getTitle(), incident.getSeverity(), incident.getAffectedService());
    }

    private EvalResult runLlmRag(Incident incident) {
        return llmRagDiagnoser.diagnose(incident.getTitle(), incident.getSeverity(), incident.getAffectedService());
    }

    private EvalResult runSingleAgent(Incident incident) {
        return primusEvalAdapter.runSingleAgent(incident);
    }

    private EvalResult runMultiAgent(Incident incident) {
        return primusEvalAdapter.runMultiAgent(incident);
    }
}