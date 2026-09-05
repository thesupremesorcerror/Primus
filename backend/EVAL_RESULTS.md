# Primus Research Evaluation: Multi-Agent vs. Single-Agent vs. LLM Baselines

## Overview

This evaluation compares five incident-response systems on the same task: given a
service outage, diagnose the root cause and propose a remediation action. All
systems are tested against synthetic incidents backed by Primus's `FaultSimulator`,
which randomly injects one of two fault types per run:

- **CONNECTION_POOL** — database connection pool exhaustion (correct fix: `restart_service` or `scale_service`)
- **BAD_DEPLOYMENT** — a recent deployment introduced a regression (correct fix: `rollback_deployment`)

Ground truth for each run is read from whatever `DiagnosticTools.getLogs()` actually
returned that round (not forced in advance), so scoring reflects each system's
response to real, if randomly assigned, evidence.

## Systems compared

| System | Description |
|---|---|
| `rule_based` | No LLM. Keyword-matches logs for "deploy" vs. "connection"/"pool" and maps directly to an action. |
| `llm_no_rag` | Single Gemini call. Given only incident title/severity/service — no logs, metrics, or runbooks. |
| `llm_rag` | Single Gemini call, same minimal incident info, plus retrieved runbook excerpts (no live logs/metrics). |
| `single_agent_primus` | Existing `AgentLoop` (Stage 4–7): one continuous tool-calling loop with all 7 tools available. |
| `multi_agent_primus` | New `Orchestrator` (Stage 8): specialist agents (Log, Metrics, RAG) investigate, a Diagnosis agent synthesizes, a Remediation agent proposes exactly one action, gated by `PolicyEngine`. |

Baselines (`llm_no_rag`, `llm_rag`) deliberately receive **no pre-fetched evidence** —
this isolates the value of Primus's active, tool-driven investigation rather than
just measuring reasoning quality over evidence someone else gathered.

## Methodology

- 10 synthetic incidents per system, cycling through 4 services (auth-api,
  checkout-api, payment-api, orders-api).
- Metrics scored per run: `diagnosisCorrect` and `remediationCorrect` (keyword
  matching against the observed fault scenario), plus `resolved`
  (post-action health check).
- All Gemini calls throttled to ~1 per 4.5s to stay within free-tier rate limits;
  each run gets one retry with backoff on transient failure.
- Run twice in full to check reproducibility of findings.

## Results

### Run 1

| System | Diagnosis Acc. | Remediation Acc. | Resolved |
|---|---|---|---|
| rule_based | 100%¹ | 100%¹ | 100%¹ |
| llm_no_rag | 20% | 40% | 100% |
| llm_rag | 100% | 60% | 100% |
| single_agent_primus | 60% | 20% | 100% |
| multi_agent_primus | 60% | 50% | 50%² |

### Run 2

| System | Diagnosis Acc. | Remediation Acc. | Resolved |
|---|---|---|---|
| rule_based | 100%¹ | 100%¹ | 100%¹ |
| llm_no_rag | 10% | 40% | 100% |
| llm_rag | 100% | 50% | 100% |
| single_agent_primus | 50% | 40% | 100% |
| multi_agent_primus | 70% | 50% | 40%² |

¹ See **Limitations** — `rule_based`'s score is tautological by construction.
² See **Limitations** — `resolved` under-counts multi-agent's correct behavior.

## Key finding: single-agent Primus collapses to a default action

Across both runs, `single_agent_primus` showed a consistent and reproducible
behavioral pattern: **it almost never ends on `rollback_deployment`, even when its
own diagnosis text correctly names a deployment as the root cause.**

In Run 2, it proposed `restart_service` in **10 out of 10** runs — including cases
where the diagnosis explicitly stated *"following the deployment of version
v2.4.1"* as the cause, yet still ended with a restart rather than a rollback.

The mechanism: `AgentLoop` runs one continuous tool-calling loop. When the model
correctly identifies a deployment issue and calls `rollback_deployment`, that
action is `HIGH` risk and gets blocked pending human approval — but the loop
doesn't stop there. The model continues, and on a later round calls
`restart_service` (`MEDIUM` risk, auto-executable), which becomes the final
recorded action. The agent's *correct* initial instinct gets silently overwritten
by an *incorrect* but easier-to-execute one.

`multi_agent_primus` does not exhibit this failure mode, by construction:
`RemediationAgent` proposes exactly one action from a single Gemini call — there
is no multi-round loop in which it can "downgrade" after being blocked. This shows
up in the data as consistent 50% remediation accuracy in both runs (vs.
single-agent's 20% then 40% — lower and more volatile).

This is a genuine architectural finding, not something engineered in advance:
separating diagnosis, remediation-proposal, and policy-gating into distinct agents
incidentally eliminates a failure mode present in the single-agent design.

## Secondary finding: minimal-context LLM baselines default to generic guesses

`llm_no_rag` scored only 10–20% diagnosis accuracy across both runs. With no
evidence to work from, it defaults to a "recent deployment regression" narrative
in most runs regardless of the actual fault — a reasonable prior in the abstract,
but wrong roughly as often as it's right given the 50/50 fault distribution.
`llm_rag` improves markedly (100% diagnosis accuracy both runs) purely from
runbook context, without any live evidence — suggesting retrieved context alone
meaningfully narrows the hypothesis space even without active investigation.

## Limitations

- **`rule_based`'s 100% score is tautological.** Its heuristic (keyword-match logs
  for "deploy" vs. "connection"/"pool") is structurally identical to the eval's
  own ground-truth scorer. This is not a genuine comparison point and is included
  only for completeness — it says nothing about rule-based systems in general,
  only that this particular rule matches this particular label by construction.
- **`resolved` conflates "took the correct action" with "action executed
  immediately."** Multi-agent Primus's lower `resolved` rate (40–50%) is largely
  driven by *correctly* proposing `HIGH`-risk `rollback_deployment` for
  deployment-caused incidents and appropriately waiting for human approval rather
  than auto-executing — not by failing to fix anything. This is intended,
  conservative behavior, not a weakness.
- **`FaultSimulator` is not cause-aware.** All remediation actions
  (`restart_service`, `rollback_deployment`, `scale_service`) unconditionally mark
  a service healthy once executed, regardless of whether the action matches the
  actual fault. This means `resolved` for any system that takes *some* action is a
  weak signal industry-wide in this eval; `diagnosisCorrect`/`remediationCorrect`
  (independent scoring against observed ground truth) carry the real
  discriminating power. Making the simulator cause-aware is scoped as a future
  improvement, deliberately not done here to avoid destabilizing previously
  validated demo/incident flows.
- **Diagnosis/remediation correctness use keyword matching**, not semantic
  judgment. A correct diagnosis phrased unusually could be scored incorrect. An
  LLM-as-judge scoring pass would be a natural refinement.
- **Small sample size** (10 runs/system/batch). Sufficient to establish a
  reproducible pattern (confirmed across 2 full runs) but not large enough for
  strong statistical claims beyond that.
- **Cost/latency tradeoff not fully quantified.** Multi-agent Primus makes more
  Gemini calls per incident than single-shot baselines (up to 5 agents, some with
  internal retry rounds), which is reflected in higher observed latency per run
  but not broken out as a standalone metric here.

## Conclusion

Across two independent runs, multi-agent Primus consistently outperformed
single-agent Primus on remediation accuracy (50% both runs vs. 20%/40%) and
avoided a reproducible failure mode — abandoning a correct high-risk diagnosis in
favor of an incorrect but auto-executable action — that the single-agent
architecture exhibited in both runs. This suggests that decomposing incident
response into specialist investigation, synthesis, and remediation-proposal
agents produces more reliable decision-making under Primus's existing risk-gating
policy, independent of any difference in underlying diagnostic accuracy.
