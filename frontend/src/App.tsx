import { useState, useEffect, Fragment } from "react";
import backgroundImage from "./assets/Primus.png";

import {
  login,
  logout,
  getIncidents,
  investigateIncident,
  getCandidates,
  approveCandidate,
  getDiagnostics,
  type Incident,
  type RemediationCandidate,
  type Diagnostics,
} from "./api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RemediationCandidate[]>([]);
  const [diagnosticsId, setDiagnosticsId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadIncidents();
    }
  }, [token]);

  async function loadIncidents() {
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (e) {
      setError("Failed to load incidents");
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

  async function handleInvestigate(id: string) {
    setLoading(true);

    try {
      await investigateIncident(id);
      await loadIncidents();
    } catch (e) {
      setError("Investigation failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCandidates(incident: Incident) {
    if (expandedId === incident.id) {
      setExpandedId(null);
      return;
    }

    setLoading(true);

    try {
      const data = await getCandidates(incident.id);
      setCandidates(data);
      setExpandedId(incident.id);
    } catch (e) {
      setError("Failed to load candidates");
    } finally {
      setLoading(false);
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

  async function handleApprove(
    incidentId: string,
    candidateId: string
  ) {
    setLoading(true);

    try {
      await approveCandidate(incidentId, candidateId);
      setExpandedId(null);
      await loadIncidents();
    } catch (e) {
      setError("Approval failed");
    } finally {
      setLoading(false);
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
        {/* Invisible hover area */}
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
          {/* Login Card */}
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

              transition:
                "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            {/* Title */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 30,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 58,
                  fontWeight: 600,
                  letterSpacing: "-2px",
                  lineHeight: 1,
                  textShadow:
                    "0 3px 20px rgba(0, 0, 0, 0.5)",
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

            {/* Login Form */}
            <form onSubmit={handleLogin}>
              {/* Username */}
              <div style={{ marginBottom: 16 }}>
                <input
                  placeholder="Username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",

                    boxSizing: "border-box",

                    borderRadius: 10,

                    border:
                      "1px solid rgba(255, 255, 255, 0.22)",

                    background:
                      "rgba(255, 255, 255, 0.08)",

                    color: "#ffffff",

                    fontSize: 15,
                    outline: "none",

                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",

                    boxShadow:
                      "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",

                    boxSizing: "border-box",

                    borderRadius: 10,

                    border:
                      "1px solid rgba(255, 255, 255, 0.22)",

                    background:
                      "rgba(255, 255, 255, 0.08)",

                    color: "#ffffff",

                    fontSize: 15,
                    outline: "none",

                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",

                    boxShadow:
                      "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                  }}
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                style={{
                  width: "100%",
                  height: 52,

                  border: "none",
                  borderRadius: 10,

                  background:
                    "linear-gradient(135deg, #a832ff 0%, #c13cff 100%)",

                  color: "#ffffff",

                  fontSize: 16,
                  fontWeight: 600,

                  cursor: "pointer",

                  boxShadow:
                    "0 8px 25px rgba(170, 59, 255, 0.45)",

                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                Log In
              </button>
            </form>

            {/* Error */}
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
     DASHBOARD
     ============================ */

  return (
    <div
      style={{
        minHeight: "100vh",

        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",

        padding: "40px 20px",

        boxSizing: "border-box",

        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 30,

          borderRadius: 16,

          background: "rgba(255, 255, 255, 0.92)",

          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",

          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>
              Primus
            </h1>

            <p
              style={{
                marginTop: 5,
                color: "#666",
              }}
            >
              Incident Response Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "9px 16px",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              color: "#dc2626",
              padding: 12,
              background: "#fee2e2",
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            {error}
          </p>
        )}

        {/* Incidents */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #ccc",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12 }}>
                  Title
                </th>

                <th style={{ padding: 12 }}>
                  Service
                </th>

                <th style={{ padding: 12 }}>
                  Severity
                </th>

                <th style={{ padding: 12 }}>
                  Status
                </th>

                <th style={{ padding: 12 }}>
                  Cause
                </th>

                <th style={{ padding: 12 }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {incidents.map((incident) => (
                <Fragment key={incident.id}>
                  <tr
                    style={{
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      {incident.title}
                    </td>

                    <td style={{ padding: 12 }}>
                      {incident.affectedService}
                    </td>

                    <td style={{ padding: 12 }}>
                      {incident.severity}
                    </td>

                    <td style={{ padding: 12 }}>
                      {incident.status}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        fontSize: 13,
                        color: "#444",
                        maxWidth: 260,
                      }}
                    >
                      {incident.rootCauseGuess || (
                        <span style={{ color: "#999" }}>
                          Not yet diagnosed
                        </span>
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {(incident.status === "OPEN" ||
                          incident.status === "REOPENED") && (
                          <button
                            disabled={loading}
                            onClick={() =>
                              handleInvestigate(
                                incident.id
                              )
                            }
                            style={{
                              padding:
                                "7px 12px",
                              border: "none",
                              borderRadius: 6,
                              background:
                                "#aa3bff",
                              color: "#fff",
                              cursor: loading
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            {loading
                              ? "Investigating..."
                              : incident.status === "REOPENED"
                              ? "Re-investigate"
                              : "Investigate"}
                          </button>
                        )}

                        {incident.status ===
                          "AWAITING_APPROVAL" && (
                          <button
                            disabled={loading}
                            onClick={() =>
                              toggleCandidates(
                                incident
                              )
                            }
                            style={{
                              padding:
                                "7px 12px",
                              border:
                                "1px solid #aa3bff",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#aa3bff",
                              cursor: loading
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            {expandedId ===
                            incident.id
                              ? "Hide Options"
                              : "Review Options"}
                          </button>
                        )}

                        <button
                          disabled={diagnosticsLoading}
                          onClick={() =>
                            toggleDiagnostics(incident)
                          }
                          style={{
                            padding: "7px 12px",
                            border: "1px solid #666",
                            borderRadius: 6,
                            background: "#fff",
                            color: "#444",
                            cursor: diagnosticsLoading
                              ? "not-allowed"
                              : "pointer",
                            fontSize: 13,
                          }}
                        >
                          {diagnosticsId === incident.id
                            ? "Hide Diagnostics"
                            : "View Diagnostics"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Diagnostics panel */}
                  {diagnosticsId === incident.id && diagnostics && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 18,
                          background: "#f5f5fa",
                        }}
                      >
                        <strong>
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
                          <MetricCard
                            label="CPU"
                            value={`${diagnostics.metrics.cpuPercent}%`}
                          />
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

                        <strong style={{ fontSize: 13 }}>
                          Recent Logs
                        </strong>

                        <div
                          style={{
                            marginTop: 8,
                            padding: 12,
                            background: "#1e1e2e",
                            borderRadius: 8,
                            fontFamily: "monospace",
                            fontSize: 12.5,
                            color: "#d4d4e0",
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
                      <td
                        colSpan={6}
                        style={{
                          padding: 18,
                          background: "#fafafa",
                        }}
                      >
                        <strong>
                          Remediation Candidates
                        </strong>

                        <table
                          style={{
                            width: "100%",
                            marginTop: 12,
                            borderCollapse:
                              "collapse",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                textAlign:
                                  "left",
                                fontSize: 13,
                                color: "#666",
                                borderBottom:
                                  "1px solid #ddd",
                              }}
                            >
                              <th
                                style={{
                                  padding: 8,
                                }}
                              >
                                Action
                              </th>

                              <th
                                style={{
                                  padding: 8,
                                }}
                              >
                                Risk
                              </th>

                              <th
                                style={{
                                  padding: 8,
                                }}
                              >
                                Expected Recovery
                              </th>

                              <th
                                style={{
                                  padding: 8,
                                }}
                              >
                                Rationale
                              </th>

                              <th
                                style={{
                                  padding: 8,
                                }}
                              >
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {candidates.map(
                              (c) => (
                                <tr
                                  key={c.id}
                                  style={{
                                    background:
                                      c.recommended
                                        ? "#eef7ee"
                                        : undefined,

                                    borderBottom:
                                      "1px solid #eee",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {c.actionType}{" "}
                                    {c.recommended &&
                                      "⭐"}
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {c.riskLevel}
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {
                                      c.expectedRecoveryPct
                                    }
                                    %
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                      fontSize: 13,
                                    }}
                                  >
                                    {c.rationale}
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    <button
                                      disabled={
                                        loading
                                      }
                                      onClick={() =>
                                        handleApprove(
                                          incident.id,
                                          c.id
                                        )
                                      }
                                      style={{
                                        padding:
                                          "6px 12px",
                                        border:
                                          "none",
                                        borderRadius: 6,
                                        background:
                                          "#16a34a",
                                        color:
                                          "#fff",
                                        cursor:
                                          loading
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      Approve
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
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
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export default App;
