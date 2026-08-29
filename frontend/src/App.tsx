import { useState, useEffect } from "react";
import {
  login,
  logout,
  getIncidents,
  investigateIncident,
  getCandidates,
  approveCandidate,
  type Incident,
  type RemediationCandidate,
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

  async function handleApprove(incidentId: string, candidateId: string) {
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

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", fontFamily: "sans-serif" }}>
        <h1>Primus</h1>
        <p>AIOps Incident Response Platform</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 10 }}>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <button type="submit" style={{ width: "100%", padding: 10 }}>
            Log In
          </button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Primus - Incidents</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Service</th>
            <th style={{ padding: 8 }}>Severity</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <>
              <tr key={incident.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{incident.title}</td>
                <td style={{ padding: 8 }}>{incident.affectedService}</td>
                <td style={{ padding: 8 }}>{incident.severity}</td>
                <td style={{ padding: 8 }}>{incident.status}</td>
                <td style={{ padding: 8 }}>
                  {incident.status === "OPEN" && (
                    <button disabled={loading} onClick={() => handleInvestigate(incident.id)}>
                      Investigate
                    </button>
                  )}
                  {incident.status === "AWAITING_APPROVAL" && (
                    <button disabled={loading} onClick={() => toggleCandidates(incident)}>
                      {expandedId === incident.id ? "Hide Options" : "Review Options"}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === incident.id && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, background: "#fafafa" }}>
                    <strong>Remediation Candidates:</strong>
                    <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", fontSize: 13, color: "#666" }}>
                          <th style={{ padding: 4 }}>Action</th>
                          <th style={{ padding: 4 }}>Risk</th>
                          <th style={{ padding: 4 }}>Expected Recovery</th>
                          <th style={{ padding: 4 }}>Rationale</th>
                          <th style={{ padding: 4 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c) => (
                          <tr key={c.id} style={{ background: c.recommended ? "#eef7ee" : undefined }}>
                            <td style={{ padding: 4 }}>
                              {c.actionType} {c.recommended && "⭐"}
                            </td>
                            <td style={{ padding: 4 }}>{c.riskLevel}</td>
                            <td style={{ padding: 4 }}>{c.expectedRecoveryPct}%</td>
                            <td style={{ padding: 4, fontSize: 13 }}>{c.rationale}</td>
                            <td style={{ padding: 4 }}>
                              <button
                                disabled={loading}
                                onClick={() => handleApprove(incident.id, c.id)}
                              >
                                Approve
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;