const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  affectedService: string;
  createdAt: string;
  resolvedAt: string | null;
  rootCauseGuess: string | null;
}

export interface Diagnostics {
  serviceName: string;
  metrics: {
    cpuPercent: number;
    memoryPercent: number;
    errorRatePercent: number;
    dbConnectionPoolUtilizationPercent: number;
  };
  logs: string[];
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data: LoginResponse = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.username);
  localStorage.setItem("role", data.role);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

export async function getIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/incidents`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function investigateIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents/${id}/investigate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to investigate incident");
  return res.json();
}

export async function getDiagnostics(id: string): Promise<Diagnostics> {
  const res = await fetch(`${API_BASE}/api/incidents/${id}/diagnostics`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch diagnostics");
  return res.json();
}

export interface RemediationCandidate {
  id: string;
  incidentId: string;
  actionType: string;
  serviceName: string;
  riskLevel: string;
  expectedRecoveryPct: number;
  rationale: string;
  recommended: boolean;
  status: string;
}

export async function getCandidates(incidentId: string): Promise<RemediationCandidate[]> {
  const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/candidates`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function approveCandidate(incidentId: string, candidateId: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/approve/${candidateId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to approve candidate");
  return res.json();
}

export interface AgentEvidence {
  type: string;
  detail: string;
  source: string;
}

export interface AgentFinding {
  agent: string;
  confidence: number;
  summary: string;
  evidence: AgentEvidence[];
  toolsCalled: string[];
}

export async function getEvidence(incidentId: string): Promise<AgentFinding[]> {
  const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/evidence`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch evidence");
  return res.json();
}

export interface MemorySearchResult {
  summary: string;
  rootCause: string;
  remediationTaken: string;
  outcome: string;
  createdAt: string;
}

export async function searchMemory(query: string, topK = 5): Promise<MemorySearchResult[]> {
  const res = await fetch(
    `${API_BASE}/api/memory/search?query=${encodeURIComponent(query)}&topK=${topK}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  if (!res.ok) throw new Error("Failed to search memory");
  return res.json();
}

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  faultType: string;
}

export async function getServiceHealth(): Promise<ServiceHealth[]> {
  const res = await fetch(`${API_BASE}/api/simulate/services`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch service health");
  return res.json();
}

export interface EvalRunResult {
  systemName: string;
  serviceName: string;
  observedScenario: string;
  diagnosis: string;
  proposedAction: string;
  resolved: boolean;
  llmCallCount: number;
  latencyMs: number;
}

export interface EvalSummary {
  systemName: string;
  totalRuns: number;
  diagnosisAccuracyPct: number;
  remediationAccuracyPct: number;
  resolvedPct: number;
  runs: EvalRunResult[];
}

export async function runEvaluation(): Promise<EvalSummary[]> {
  const res = await fetch(`${API_BASE}/api/eval/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to run evaluation");
  return res.json();
}

export async function rejectCandidate(incidentId: string, candidateId: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/reject/${candidateId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to reject candidate");
  return res.json();
}
