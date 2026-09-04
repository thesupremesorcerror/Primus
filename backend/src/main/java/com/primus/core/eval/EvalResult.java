package com.primus.core.eval;

public record EvalResult(
        String systemName,
        String serviceName,
        String observedScenario,   // ground truth as read from getLogs() output: CONNECTION_POOL, BAD_DEPLOYMENT, or UNKNOWN
        String diagnosis,
        String proposedAction,
        boolean resolved,          // checkServiceHealth() after action
        int llmCallCount,          // cost proxy
        long latencyMs
) {
    public boolean diagnosisCorrect() {
        if (observedScenario.equals("CONNECTION_POOL")) {
            return diagnosis.toLowerCase().contains("connection") || diagnosis.toLowerCase().contains("pool");
        } else if (observedScenario.equals("BAD_DEPLOYMENT")) {
            return diagnosis.toLowerCase().contains("deploy");
        }
        return false;
    }

    public boolean remediationCorrect() {
        if (observedScenario.equals("CONNECTION_POOL")) {
            return proposedAction.equals("restart_service") || proposedAction.equals("scale_service");
        } else if (observedScenario.equals("BAD_DEPLOYMENT")) {
            return proposedAction.equals("rollback_deployment");
        }
        return false;
    }
}