import { useState } from "react";
import { adminToken, api, setAdminToken } from "./api";
import { useHashRoute, usePolling } from "./hooks";
import { ErrorBanner, EvidenceValue, SectionTitle, StatusPill } from "./components/UI";
import { Overview } from "./pages/Overview";
import { Isolation } from "./pages/Isolation";
import { RedLab } from "./pages/RedLab";
import { BlueLab } from "./pages/BlueLab";
import { Findings } from "./pages/Findings";
import { Audit } from "./pages/Audit";
import { Suite } from "./pages/Suite";
import { Judge } from "./pages/Judge";
import { Verifier } from "./pages/Verifier";

const NAV = [
  { id: "overview", label: "Overview", glyph: "◈", hint: "evidence console" },
  { id: "isolation", label: "Isolation", glyph: "⬡", hint: "naive vs hardened" },
  { id: "red", label: "Red lab", glyph: "✦", hint: "runs & findings" },
  { id: "blue", label: "Blue lab", glyph: "◆", hint: "sealed verdicts" },
  { id: "findings", label: "Findings", glyph: "▣", hint: "proof bundles" },
  { id: "audit", label: "Audit", glyph: "⛓", hint: "verify & tamper" },
  { id: "suite", label: "Suite & report", glyph: "☑", hint: "trust report" },
  { id: "judge", label: "Judge challenge", glyph: "⚔", hint: "participatory proof" },
  { id: "verifier", label: "Browser verifier", glyph: "⌘", hint: "no server trust" },
];

const TITLES: Record<string, string> = {
  overview: "Evidence console",
  isolation: "Isolation map",
  red: "Red lab",
  blue: "Blue lab",
  findings: "Proof-carrying findings",
  audit: "Audit explorer",
  suite: "Challenge suite & Trust Report",
  judge: "Judge challenge",
  verifier: "Browser verifier",
};

export default function App() {
  const [route, navigate] = useHashRoute();
  const health = usePolling(() => api.get<any>("/v1/health"), 5000);
  const integrity = usePolling(() => api.get<any>("/v1/ledger/verify"), 7000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [token, setToken] = useState(adminToken());

  const mode = health.data?.mode ?? "hardened";
  const verified = integrity.data?.status === "VERIFIED";
  const integrityStatus = !integrity.data ? "untested" : verified ? "verified" : "unverified";
  const headSeq = integrity.data?.head?.seq ?? integrity.data?.chain?.head_seq ?? 0;

  let page: React.ReactNode;
  switch (route) {
    case "isolation":
      page = <Isolation />;
      break;
    case "red":
      page = <RedLab navigate={navigate} />;
      break;
    case "blue":
      page = <BlueLab navigate={navigate} />;
      break;
    case "findings":
      page = <Findings navigate={navigate} />;
      break;
    case "audit":
      page = <Audit navigate={navigate} />;
      break;
    case "suite":
      page = <Suite />;
      break;
    case "judge":
      page = <Judge navigate={navigate} />;
      break;
    case "verifier":
      page = <Verifier />;
      break;
    default:
      page = <Overview navigate={navigate} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("overview")}>
          <span className="brand-mark">B</span>
          <span>
            <span className="brand-name">BASTION<span>LOOP</span></span>
            <span className="brand-sub">proof-carrying findings</span>
          </span>
        </button>

        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${route === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-glyph">{item.glyph}</span>
              <span className="nav-labels">
                <span className="nav-label">{item.label}</span>
                <span className="nav-hint">{item.hint}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="foot-line">
            <span>mode</span>
            <StatusPill status={mode} label={mode.toUpperCase()} />
          </div>
          <div className="foot-line">
            <span>integrity</span>
            <StatusPill status={verified ? "verified" : integrity.data ? "failed" : "untested"} />
          </div>
          <div className="foot-mini">
            <EvidenceValue
              value={`${integrity.data?.counts?.events ?? 0} events`}
              evidenceId={headSeq ? `seq:${headSeq}` : null}
              status={integrityStatus}
            />
          </div>
          <button className="btn btn-ghost btn-xs full" onClick={() => navigate("judge")}>
            Run judge challenge
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="crumb">BASTIONLOOP /</span>
            <span className="topbar-title">{TITLES[route] ?? "Evidence console"}</span>
          </div>
          <div className="topbar-right">
            <span className="policy-chip mono">{health.data?.policy?.version ?? "policy?"}</span>
            <StatusPill status={mode} label={mode === "naive" ? "NAIVE DEMO" : "HARDENED"} />
            <button
              className={`pill pill-${verified ? "verified" : integrity.data ? "failed" : "untested"} pill-button`}
              onClick={() => navigate("audit")}
            >
              {verified ? "LEDGER VERIFIED" : integrity.data ? "LEDGER FAILED" : "NO EVIDENCE"}
            </button>
            <button className="icon-button" title="Admin token" onClick={() => setSettingsOpen((value) => !value)}>
              ⚙
            </button>
          </div>
        </header>

        {health.error && <ErrorBanner message={`${health.error}. Is the gateway running?`} onRetry={health.refresh} />}

        {settingsOpen && (
          <div className="settings-panel">
            <div>
              <strong>Demo admin token</strong>
              <p className="muted small">
                Stored in localStorage. This is a hackathon demo credential, not a production auth system. The gateway
                still enforces scoped capability tokens for judges and red workers.
              </p>
            </div>
            <input
              className="input"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="dev-admin-token"
            />
            <button
              className="btn btn-primary btn-xs"
              onClick={() => {
                setAdminToken(token);
                window.location.reload();
              }}
            >
              Save & reload
            </button>
          </div>
        )}

        <div className="content">{page}</div>

        <footer className="footer">
          <span>BastionLoop · Bayora Problem 04</span>
          <span>Evidence over claims. Passed means the tested control held on the tested path.</span>
          <span className="mono">gateway {health.data?.gateway_image ?? "unknown"}</span>
        </footer>
      </main>
    </div>
  );
}
