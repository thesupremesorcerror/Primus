import { useState, useEffect, Fragment } from "react";
import backgroundImage from "./assets/Primus.png";

import {
  login,
  logout,
  getIncidents,
  investigateIncident,
  getCandidates,
  approveCandidate,
  rejectCandidate,
  getDiagnostics,
  runEvaluation,
  type Incident,
  type RemediationCandidate,
  type Diagnostics,
  type EvalSummary,
} from "./api";

const COLORS = {
  bg: "#0a0e16",
  panel: "#12172290",
  panelSolid: "#131824",
  border: "#232a3b",
  borderLight: "#2d3448",
  text: "#e6e8ec",
  textDim: "#8b93a7",
  accent: "#22d3ee",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
};

function statusColor(status: string): string {
  switch (status) {
    case "RESOLVED":
      return COLORS.green;
    case "AWAITING_APPROVAL":
      return COLORS.orange;
    case "REOPENED":
      return COLORS.red;
    case "OPEN":
      return COLORS.blue;
    default:
      return COLORS.purple;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
      return COLORS.red;
    case "MEDIUM":
      return COLORS.orange;
    default:
      return COLORS.textDim;
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}22`,
        border: `1px solid ${color}55`,
      }}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        padding: "18px 20px",
        background: COLORS.panelSolid,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 12, color: COLORS.textDim, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          marginTop: 6,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: COLORS.panelSolid,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: COLORS.textDim,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2, color: COLORS.text }}>
        {value}
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [systemOnline, setSystemOnline] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RemediationCandidate[]>([]);
  const [diagnosticsId, setDiagnosticsId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [view, setView] = useState<"command" | "research">("command");
  const [whyId, setWhyId] = useState<string | null>(null);
  const [beforeAfter, setBeforeAfter] = useState<{
    incidentId: string;
    action: string;
    before: Diagnostics;
    after: Diagnostics;
  } | null>(null);
  const [evalResults, setEvalResults] = useState<EvalSummary[] | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadIncidents();
    }
  }, [token]);

  async function loadIncidents() {
    try {
      const data = await getIncidents();
      setIncidents(data);
      setSystemOnline(true);
    } catch (e) {
      setError("Failed to load incidents");
      setSystemOnline(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await login(username, password);
      setToken(res.token);
    } catch (e) {
      setError("Invalid username or password");
    }
  }

  function handleLogout() {
    logout();
    setToken(null);
    setIncidents([]);
    setExpandedId(null);
    setDiagnosticsId(null);
  }

  function isLoading(id: string): boolean {
    return loadingIds.has(id);
  }

  function setLoadingFor(id: string, value: boolean) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleInvestigate(id: string) {
    setLoadingFor(id, true);

    try {
      await investigateIncident(id);
      await loadIncidents();
    } catch (e) {
      setError("Investigation failed");
    } finally {
      setLoadingFor(id, false);
    }
  }

  async function toggleCandidates(incident: Incident) {
    if (expandedId === incident.id) {
      setExpandedId(null);
      return;
    }

    setLoadingFor(incident.id, true);

    try {
      const data = await getCandidates(incident.id);
      setCandidates(data);
      setExpandedId(incident.id);
    } catch (e) {
      setError("Failed to load candidates");
    } finally {
      setLoadingFor(incident.id, false);
    }
  }

  async function toggleDiagnostics(incident: Incident) {
    if (diagnosticsId === incident.id) {
      setDiagnosticsId(null);
      setDiagnostics(null);
      return;
    }

    setDiagnosticsLoading(true);

    try {
      const data = await getDiagnostics(incident.id);
      setDiagnostics(data);
      setDiagnosticsId(incident.id);
    } catch (e) {
      setError("Failed to load diagnostics");
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  async function handleApprove(incidentId: string, candidateId: string, actionType: string) {
    setLoadingFor(incidentId, true);

    try {
      const before = await getDiagnostics(incidentId);
      await approveCandidate(incidentId, candidateId);
      const after = await getDiagnostics(incidentId);
      setBeforeAfter({ incidentId, action: actionType, before, after });
      setExpandedId(null);
      await loadIncidents();
    } catch (e) {
      setError("Approval failed");
    } finally {
      setLoadingFor(incidentId, false);
    }
  }

  async function handleRunEvaluation() {
    setEvalLoading(true);
    setError("");

    try {
      const data = await runEvaluation();
      setEvalResults(data);
    } catch (e) {
      setError("Evaluation run failed");
    } finally {
      setEvalLoading(false);
    }
  }

  async function handleReject(incidentId: string, candidateId: string) {
    setLoadingFor(incidentId, true);

    try {
      await rejectCandidate(incidentId, candidateId);
      setExpandedId(null);
      await loadIncidents();
    } catch (e) {
      setError("Rejection failed");
    } finally {
      setLoadingFor(incidentId, false);
    }
  }

  /* ============================
     LOGIN SCREEN
     ============================ */

  if (!token) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          className="login-trigger"
          style={{
            width: "min(460px, calc(100vw - 40px))",
            padding: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
          <div
            className="login-card"
            style={{
              width: "100%",
              padding: "38px 40px 40px",
              borderRadius: 20,
              background: "rgba(10, 8, 20, 0.08)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: `
                0 15px 40px rgba(0, 0, 0, 0.18),
                inset 0 1px 1px rgba(255, 255, 255, 0.10)
              `,
              boxSizing: "border-box",
              opacity: 0,
              transform: "translateY(10px) scale(0.97)",
              pointerEvents: "none",
              transition: "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <h1
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 58,
                  fontWeight: 600,
                  letterSpacing: "-2px",
                  lineHeight: 1,
                  textShadow: "0 3px 20px rgba(0, 0, 0, 0.5)",
                }}
              >
                Primus
              </h1>
              <p
                style={{
                  marginTop: 8,
                  color: "rgba(255, 255, 255, 0.82)",
                  fontSize: 16,
                }}
              >
                AIOps Incident Response Platform
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",
                    boxSizing: "border-box",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.22)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontSize: 15,
                    outline: "none",
                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",
                    boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",
                    boxSizing: "border-box",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.22)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontSize: 15,
                    outline: "none",
                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",
                    boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  height: 52,
                  border: "none",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #a832ff 0%, #c13cff 100%)",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 8px 25px rgba(170, 59, 255, 0.45)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                Log In
              </button>
            </form>

            {error && (
              <p
                style={{
                  color: "#ff8f8f",
                  marginTop: 18,
                  marginBottom: 0,
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ============================
     COMMAND CENTER DASHBOARD
     ============================ */

  const openCount = incidents.filter(
    (i) => i.status === "OPEN" || i.status === "DIAGNOSING"
  ).length;
  const awaitingCount = incidents.filter(
    (i) => i.status === "AWAITING_APPROVAL"
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;
  const reopenedCount = incidents.filter((i) => i.status === "REOPENED").length;

  const recentActivity = [...incidents]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: COLORS.bg,
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: COLORS.text,
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: -0.5,
              marginBottom: 30,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: COLORS.accent }}>⚡</span> Primus
          </div>

          <div
            onClick={() => setView("command")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: view === "command" ? `${COLORS.accent}18` : "transparent",
              border: `1px solid ${view === "command" ? COLORS.accent + "44" : "transparent"}`,
              color: view === "command" ? COLORS.accent : COLORS.textDim,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Command Center
          </div>

          <div
            onClick={() => setView("research")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: view === "research" ? `${COLORS.accent}18` : "transparent",
              border: `1px solid ${view === "research" ? COLORS.accent + "44" : "transparent"}`,
              color: view === "research" ? COLORS.accent : COLORS.textDim,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Research / Eval
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: COLORS.textDim,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: systemOnline ? COLORS.green : COLORS.red,
              display: "inline-block",
              boxShadow: systemOnline
                ? `0 0 8px ${COLORS.green}`
                : `0 0 8px ${COLORS.red}`,
            }}
          />
          {systemOnline ? "SYSTEM ONLINE" : "CONNECTION LOST"}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "28px 32px", overflowX: "hidden" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              Primus Command Center
            </h1>
            <p style={{ marginTop: 4, color: COLORS.textDim, fontSize: 14 }}>
              Autonomous incident detection, diagnosis and remediation
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: COLORS.green,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: COLORS.green,
                  boxShadow: `0 0 6px ${COLORS.green}`,
                }}
              />
              LIVE
            </span>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                background: COLORS.panelSolid,
                color: COLORS.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Log Out
            </button>
          </div>
        </div>

        {error && (
          <p
            style={{
              color: COLORS.red,
              padding: 12,
              background: `${COLORS.red}18`,
              border: `1px solid ${COLORS.red}44`,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            {error}
          </p>
        )}

        {beforeAfter && (
          <div
            style={{
              background: COLORS.panelSolid,
              border: `1px solid ${COLORS.green}44`,
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <strong style={{ fontSize: 13 }}>
                Execution Result — {beforeAfter.action} on {beforeAfter.before.serviceName}
              </strong>
              <button
                onClick={() => setBeforeAfter(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.textDim,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8 }}>
                  BEFORE
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <MetricCard label="CPU" value={`${beforeAfter.before.metrics.cpuPercent}%`} />
                  <MetricCard
                    label="Error Rate"
                    value={`${beforeAfter.before.metrics.errorRatePercent}%`}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: COLORS.textDim }}>
                →
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11, color: COLORS.green, marginBottom: 8 }}>
                  AFTER
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <MetricCard label="CPU" value={`${beforeAfter.after.metrics.cpuPercent}%`} />
                  <MetricCard
                    label="Error Rate"
                    value={`${beforeAfter.after.metrics.errorRatePercent}%`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "command" && (
        <>
        {/* Stat cards */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Total Incidents" value={incidents.length} color={COLORS.text} />
          <StatCard label="Open" value={openCount} color={COLORS.blue} />
          <StatCard label="Awaiting Approval" value={awaitingCount} color={COLORS.orange} />
          <StatCard label="Reopened" value={reopenedCount} color={COLORS.red} />
          <StatCard label="Resolved" value={resolvedCount} color={COLORS.green} />
        </div>

        {/* Activity feed */}
        <div
          style={{
            background: COLORS.panelSolid,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "18px 20px",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            📡 Live Activity Feed
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ color: COLORS.textDim, fontSize: 13 }}>
              No incidents yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentActivity.map((incident) => (
                <div
                  key={incident.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: `${COLORS.borderLight}44`,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span>
                    <strong>{incident.affectedService}</strong> — {incident.title}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge label={incident.status} color={statusColor(incident.status)} />
                    <span style={{ color: COLORS.textDim, fontSize: 12 }}>
                      {relativeTime(incident.createdAt)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incident table */}
        <div
          style={{
            background: COLORS.panelSolid,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${COLORS.border}`,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Incidents
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}`, textAlign: "left" }}>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>TITLE</th>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>SERVICE</th>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>SEVERITY</th>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>STATUS</th>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>CAUSE</th>
                  <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {incidents.map((incident) => (
                  <Fragment key={incident.id}>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: 14, fontSize: 13 }}>{incident.title}</td>
                      <td style={{ padding: 14, fontSize: 13, color: COLORS.textDim }}>
                        {incident.affectedService}
                      </td>
                      <td style={{ padding: 14 }}>
                        <Badge label={incident.severity} color={severityColor(incident.severity)} />
                      </td>
                      <td style={{ padding: 14 }}>
                        <Badge label={incident.status} color={statusColor(incident.status)} />
                      </td>
                      <td
                        style={{
                          padding: 14,
                          fontSize: 12.5,
                          color: COLORS.textDim,
                          maxWidth: 260,
                        }}
                      >
                        {incident.rootCauseGuess || "Not yet diagnosed"}
                      </td>
                      <td style={{ padding: 14 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(incident.status === "OPEN" ||
                            incident.status === "REOPENED") && (
                            <button
                              disabled={isLoading(incident.id)}
                              onClick={() => handleInvestigate(incident.id)}
                              style={{
                                padding: "7px 12px",
                                border: "none",
                                borderRadius: 6,
                                background: COLORS.accent,
                                color: "#04222a",
                                fontWeight: 600,
                                cursor: isLoading(incident.id) ? "not-allowed" : "pointer",
                                fontSize: 12.5,
                              }}
                            >
                              {isLoading(incident.id)
                                ? "Investigating..."
                                : incident.status === "REOPENED"
                                ? "Re-investigate"
                                : "Investigate"}
                            </button>
                          )}

                          {incident.status === "AWAITING_APPROVAL" && (
                            <button
                              disabled={isLoading(incident.id)}
                              onClick={() => toggleCandidates(incident)}
                              style={{
                                padding: "7px 12px",
                                border: `1px solid ${COLORS.orange}`,
                                borderRadius: 6,
                                background: "transparent",
                                color: COLORS.orange,
                                cursor: isLoading(incident.id) ? "not-allowed" : "pointer",
                                fontSize: 12.5,
                              }}
                            >
                              {expandedId === incident.id ? "Hide Options" : "Review Options"}
                            </button>
                          )}

                          <button
                            disabled={diagnosticsLoading}
                            onClick={() => toggleDiagnostics(incident)}
                            style={{
                              padding: "7px 12px",
                              border: `1px solid ${COLORS.borderLight}`,
                              borderRadius: 6,
                              background: "transparent",
                              color: COLORS.textDim,
                              cursor: diagnosticsLoading ? "not-allowed" : "pointer",
                              fontSize: 12.5,
                            }}
                          >
                            {diagnosticsId === incident.id ? "Hide Diagnostics" : "Diagnostics"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Diagnostics panel */}
                    {diagnosticsId === incident.id && diagnostics && (
                      <tr>
                        <td colSpan={6} style={{ padding: 18, background: "#0d1119" }}>
                          <strong style={{ fontSize: 13 }}>
                            Live Diagnostics — {diagnostics.serviceName}
                          </strong>

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              marginTop: 12,
                              marginBottom: 16,
                              flexWrap: "wrap",
                            }}
                          >
                            <MetricCard label="CPU" value={`${diagnostics.metrics.cpuPercent}%`} />
                            <MetricCard
                              label="Memory"
                              value={`${diagnostics.metrics.memoryPercent}%`}
                            />
                            <MetricCard
                              label="Error Rate"
                              value={`${diagnostics.metrics.errorRatePercent}%`}
                            />
                            <MetricCard
                              label="DB Pool Utilization"
                              value={`${diagnostics.metrics.dbConnectionPoolUtilizationPercent}%`}
                            />
                          </div>

                          <strong style={{ fontSize: 12, color: COLORS.textDim }}>
                            RECENT LOGS
                          </strong>

                          <div
                            style={{
                              marginTop: 8,
                              padding: 12,
                              background: "#05070c",
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 8,
                              fontFamily: "monospace",
                              fontSize: 12.5,
                              color: "#9fe6b0",
                              maxHeight: 180,
                              overflowY: "auto",
                            }}
                          >
                            {diagnostics.logs.map((line, i) => (
                              <div key={i} style={{ marginBottom: 4 }}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Candidates */}
                    {expandedId === incident.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: 18, background: "#0d1119" }}>
                          <strong style={{ fontSize: 13 }}>Remediation Candidates</strong>

                          <table
                            style={{
                              width: "100%",
                              marginTop: 12,
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  textAlign: "left",
                                  fontSize: 12,
                                  color: COLORS.textDim,
                                  borderBottom: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <th style={{ padding: 8 }}>Action</th>
                                <th style={{ padding: 8 }}>Risk</th>
                                <th style={{ padding: 8 }}>Expected Recovery</th>
                                <th style={{ padding: 8 }}>Rationale</th>
                                <th style={{ padding: 8 }}></th>
                              </tr>
                            </thead>

                            <tbody>
                              {candidates.map((c) => (
                                <Fragment key={c.id}>
                                <tr
                                  style={{
                                    background: c.recommended ? `${COLORS.green}14` : undefined,
                                    borderBottom: `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  <td style={{ padding: 8, fontSize: 13 }}>
                                    {c.actionType} {c.recommended && "⭐"}
                                  </td>
                                  <td style={{ padding: 8 }}>
                                    <Badge label={c.riskLevel} color={severityColor(c.riskLevel)} />
                                  </td>
                                  <td style={{ padding: 8, fontSize: 13 }}>
                                    {c.expectedRecoveryPct}%
                                  </td>
                                  <td style={{ padding: 8, fontSize: 12.5, color: COLORS.textDim }}>
                                    {c.rationale}
                                  </td>
                                  <td style={{ padding: 8 }}>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button
                                        disabled={isLoading(incident.id)}
                                        onClick={() =>
                                          setWhyId(whyId === c.id ? null : c.id)
                                        }
                                        style={{
                                          padding: "6px 10px",
                                          border: `1px solid ${COLORS.accent}`,
                                          borderRadius: 6,
                                          background: "transparent",
                                          color: COLORS.accent,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          fontSize: 12.5,
                                        }}
                                      >
                                        Why?
                                      </button>
                                      <button
                                        disabled={isLoading(incident.id)}
                                        onClick={() => handleApprove(incident.id, c.id, c.actionType)}
                                        style={{
                                          padding: "6px 12px",
                                          border: "none",
                                          borderRadius: 6,
                                          background: COLORS.green,
                                          color: "#05270f",
                                          fontWeight: 600,
                                          cursor: isLoading(incident.id) ? "not-allowed" : "pointer",
                                          fontSize: 12.5,
                                        }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        disabled={isLoading(incident.id)}
                                        onClick={() => handleReject(incident.id, c.id)}
                                        style={{
                                          padding: "6px 12px",
                                          border: `1px solid ${COLORS.red}`,
                                          borderRadius: 6,
                                          background: "transparent",
                                          color: COLORS.red,
                                          fontWeight: 600,
                                          cursor: isLoading(incident.id) ? "not-allowed" : "pointer",
                                          fontSize: 12.5,
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {whyId === c.id && (
                                  <tr>
                                    <td colSpan={5} style={{ padding: "4px 8px 14px" }}>
                                      <div
                                        style={{
                                          padding: 14,
                                          background: "#0d1119",
                                          border: `1px solid ${COLORS.borderLight}`,
                                          borderRadius: 8,
                                          fontSize: 12.5,
                                          lineHeight: 1.7,
                                        }}
                                      >
                                        <div style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 6 }}>
                                          WHY DID PRIMUS CHOOSE {c.actionType.toUpperCase()}?
                                        </div>
                                        <div>
                                          <strong>Diagnosis:</strong>{" "}
                                          {incident.rootCauseGuess || "Not yet diagnosed"}
                                        </div>
                                        <div>
                                          <strong>Rationale:</strong> {c.rationale}
                                        </div>
                                        <div>
                                          <strong>Expected recovery:</strong> {c.expectedRecoveryPct}%
                                        </div>
                                        <div>
                                          <strong>Risk classification:</strong> {c.riskLevel}
                                          {c.riskLevel === "HIGH"
                                            ? " — PolicyEngine requires human approval before this can execute."
                                            : " — eligible for automatic execution under current policy."}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {view === "research" && (
          <div>
            <div
              style={{
                background: COLORS.panelSolid,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "18px 20px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    Single-Agent vs Multi-Agent Evaluation
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>
                    Runs 5 systems against 10 identical simulated incidents each —
                    rule-based, LLM (no RAG), LLM+RAG, single-agent Primus, multi-agent
                    Primus.
                  </div>
                </div>

                <button
                  disabled={evalLoading}
                  onClick={handleRunEvaluation}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: 8,
                    background: COLORS.accent,
                    color: "#04222a",
                    fontWeight: 600,
                    cursor: evalLoading ? "not-allowed" : "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {evalLoading ? "Running (may take a few minutes)..." : "Run Evaluation"}
                </button>
              </div>
            </div>

            {evalResults && (
              <div
                style={{
                  background: COLORS.panelSolid,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}`, textAlign: "left" }}>
                      <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>SYSTEM</th>
                      <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>RUNS</th>
                      <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>
                        DIAGNOSIS ACCURACY
                      </th>
                      <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>
                        REMEDIATION ACCURACY
                      </th>
                      <th style={{ padding: 14, fontSize: 12, color: COLORS.textDim }}>
                        RESOLVED
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResults.map((s) => (
                      <tr key={s.systemName} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: 14, fontSize: 13, fontWeight: 600 }}>
                          {s.systemName}
                        </td>
                        <td style={{ padding: 14, fontSize: 13, color: COLORS.textDim }}>
                          {s.totalRuns}
                        </td>
                        <td style={{ padding: 14 }}>
                          <Badge
                            label={`${s.diagnosisAccuracyPct}%`}
                            color={s.diagnosisAccuracyPct >= 70 ? COLORS.green : COLORS.orange}
                          />
                        </td>
                        <td style={{ padding: 14 }}>
                          <Badge
                            label={`${s.remediationAccuracyPct}%`}
                            color={s.remediationAccuracyPct >= 70 ? COLORS.green : COLORS.orange}
                          />
                        </td>
                        <td style={{ padding: 14 }}>
                          <Badge
                            label={`${s.resolvedPct}%`}
                            color={s.resolvedPct >= 70 ? COLORS.green : COLORS.orange}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!evalResults && !evalLoading && (
              <div style={{ color: COLORS.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>
                Click "Run Evaluation" to compare single-agent vs multi-agent performance
                against identical simulated incidents.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
