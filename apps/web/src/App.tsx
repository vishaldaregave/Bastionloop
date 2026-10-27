import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useHashRoute, usePolling } from "./hooks";
import { CommandPalette, type PaletteCommand } from "./components/CommandPalette";
import { Icon, type IconName } from "./components/Icon";
import { ErrorBanner, StatusPill } from "./components/UI";
import { Audit } from "./pages/Audit";
import { BlueLab } from "./pages/BlueLab";
import { Findings } from "./pages/Findings";
import { Isolation } from "./pages/Isolation";
import { Judge } from "./pages/Judge";
import { Overview } from "./pages/Overview";
import { RedLab } from "./pages/RedLab";
import { Settings, type Theme } from "./pages/Settings";
import { Suite } from "./pages/Suite";
import { Verifier } from "./pages/Verifier";

type RouteMeta = {
  section: string;
  label: string;
  sectionLabel: string;
  icon: IconName;
};

const ROUTES: Record<string, RouteMeta> = {
  overview: { section: "overview", label: "Overview", sectionLabel: "Overview", icon: "overview" },
  red: { section: "runs", label: "Test Runs", sectionLabel: "Test Runs", icon: "runs" },
  blue: { section: "runs", label: "Blue Lab", sectionLabel: "Test Runs", icon: "shield" },
  isolation: { section: "runs", label: "Isolation", sectionLabel: "Test Runs", icon: "activity" },
  findings: { section: "findings", label: "Findings", sectionLabel: "Findings", icon: "findings" },
  audit: { section: "evidence", label: "Evidence & PCFs", sectionLabel: "Evidence & PCFs", icon: "evidence" },
  suite: { section: "evidence", label: "Trust Report", sectionLabel: "Evidence & PCFs", icon: "activity" },
  verifier: { section: "verification", label: "Verification", sectionLabel: "Verification", icon: "verification" },
  judge: { section: "verification", label: "Judge Challenge", sectionLabel: "Verification", icon: "play" },
  settings: { section: "settings", label: "Settings", sectionLabel: "Settings", icon: "settings" },
};

const NAV = [
  { id: "overview", label: "Overview", icon: "overview" as IconName },
  { id: "runs", label: "Test Runs", icon: "runs" as IconName, route: "red" },
  { id: "findings", label: "Findings", icon: "findings" as IconName },
  { id: "evidence", label: "Evidence & PCFs", icon: "evidence" as IconName, route: "audit" },
  { id: "verification", label: "Verification", icon: "verification" as IconName, route: "verifier" },
  { id: "settings", label: "Settings", icon: "settings" as IconName },
];

const SUBNAV: Record<string, Array<{ route: string; label: string }>> = {
  runs: [
    { route: "red", label: "Runs" },
    { route: "blue", label: "Blue Lab" },
    { route: "isolation", label: "Isolation" },
  ],
  evidence: [
    { route: "audit", label: "Timeline" },
    { route: "suite", label: "Trust Report" },
  ],
  verification: [
    { route: "verifier", label: "Browser verifier" },
    { route: "judge", label: "Judge challenge" },
  ],
};

function readTheme(): Theme {
  return localStorage.getItem("bastionloop.theme") === "dark" ? "dark" : "light";
}

function readCollapsed(): boolean {
  return localStorage.getItem("bastionloop.sidebar") === "collapsed";
}

export default function App() {
  const [route, navigate] = useHashRoute();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const meta = ROUTES[route] ?? ROUTES.overview;
  const health = usePolling(() => api.get<any>("/v1/health"), 10000);
  const integrity = usePolling(() => api.get<any>("/v1/ledger/verify"), 7000);

  const mode = health.data?.mode;
  const modelAdapter = health.data?.services?.model?.adapter;
  const healthLoading = health.loading && !health.data;
  const integrityLoading = integrity.loading && !integrity.data;
  const verified = integrity.data?.status === "VERIFIED";
  const integrityStatus = integrity.error
    ? "disconnected"
    : integrityLoading
      ? "checking"
      : !integrity.data
        ? "untested"
        : verified
          ? "verified"
          : "unverified";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bastionloop.theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("bastionloop.sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  useEffect(() => {
    let pendingG = false;
    let timer: number | undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable),
      );

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }
      if (event.key === "Escape" && paletteOpen) {
        event.preventDefault();
        setPaletteOpen(false);
        return;
      }
      if (typing || paletteOpen || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key.toLowerCase() === "g") {
        pendingG = true;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          pendingG = false;
        }, 900);
        return;
      }
      if (!pendingG) return;
      const destinations: Record<string, string> = {
        o: "overview",
        t: "red",
        b: "blue",
        i: "isolation",
        f: "findings",
        e: "audit",
        r: "suite",
        v: "verifier",
        j: "judge",
        s: "settings",
      };
      const destination = destinations[event.key.toLowerCase()];
      pendingG = false;
      window.clearTimeout(timer);
      if (destination) {
        event.preventDefault();
        navigate(destination);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [navigate, paletteOpen]);

  const commands: PaletteCommand[] = useMemo(
    () => [
      ...Object.entries(ROUTES).map(([id, item]) => ({
        id: `go-${id}`,
        label: item.label,
        hint: item.sectionLabel === item.label ? "Open page" : `Open in ${item.sectionLabel}`,
        keywords: `${id} ${item.sectionLabel}`,
        icon: item.icon,
        run: () => navigate(id),
      })),
      {
        id: "toggle-theme",
        label: theme === "light" ? "Switch to dark theme" : "Switch to light theme",
        hint: "Appearance",
        keywords: "theme dark light appearance",
        icon: theme === "light" ? "moon" : "sun",
        run: () => setTheme(theme === "light" ? "dark" : "light"),
      },
      {
        id: "toggle-sidebar",
        label: collapsed ? "Expand sidebar" : "Collapse sidebar",
        hint: "Layout",
        keywords: "sidebar collapse expand navigation",
        icon: "panel",
        run: () => setCollapsed((current) => !current),
      },
      {
        id: "refresh-health",
        label: "Refresh service health",
        hint: "Gateway probe",
        keywords: "services health refresh",
        icon: "refresh",
        run: () => void health.refresh(),
      },
      {
        id: "verify-ledger",
        label: "Verify ledger now",
        hint: "Append-only evidence",
        keywords: "ledger verify chain checkpoint",
        icon: "verification",
        run: () => void integrity.refresh(),
      },
    ],
    [collapsed, health, integrity, navigate, theme],
  );

  let page: ReactNode;
  switch (route) {
    case "red":
      page = <RedLab navigate={navigate} />;
      break;
    case "blue":
      page = <BlueLab navigate={navigate} />;
      break;
    case "isolation":
      page = <Isolation />;
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
    case "settings":
      page = (
        <Settings
          theme={theme}
          onThemeChange={setTheme}
          openPalette={() => setPaletteOpen(true)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((current) => !current)}
        />
      );
      break;
    default:
      page = <Overview navigate={navigate} />;
  }

  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <button className="brand" onClick={() => navigate("overview")} aria-label="BastionLoop overview">
            <span className="brand-mark">B</span>
            {!collapsed && (
              <span className="brand-copy">
                <span className="brand-name">BastionLoop</span>
                <span className="brand-sub">Evidence workbench</span>
              </span>
            )}
          </button>
          <button
            className="icon-button collapse-button"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <Icon name="panel" size={15} />
          </button>
        </div>

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => {
            const active = meta.section === item.id;
            const destination = item.route ?? item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => navigate(destination)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <span className="nav-glyph"><Icon name={item.icon} size={16} /></span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && active && <span className="nav-active-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          {!collapsed ? (
            <>
              <div className="sidebar-status">
                <span className={`status-dot ${verified ? "ok" : integrity.error ? "bad" : "idle"}`} />
                <span>
                  {integrity.error
                    ? "Gateway disconnected"
                    : integrityLoading
                      ? "Checking evidence"
                      : verified
                        ? "Ledger verified"
                        : integrity.data
                          ? "Ledger failed"
                          : "No evidence"}
                </span>
              </div>
              <div className="sidebar-meta">
                <span>{integrity.data ? `${integrity.data.counts?.events ?? 0} events` : integrityLoading ? "Reading ledger" : "0 events"}</span>
                <span>·</span>
                <span>{healthLoading ? "CHECKING MODE" : mode ? mode.toUpperCase() : "MODE UNKNOWN"}</span>
              </div>
              <div className="sidebar-meta">
                <span>{healthLoading ? "CHECKING ENV" : health.data?.environment?.toUpperCase() ?? "ENV UNKNOWN"}</span>
                <span>·</span>
                <span>{healthLoading ? "CHECKING MODEL" : modelAdapter ? `${modelAdapter.toUpperCase()} MODEL` : "MODEL UNKNOWN"}</span>
              </div>
            </>
          ) : (
            <span className={`status-dot ${verified ? "ok" : integrity.error ? "bad" : "idle"}`} title={integrityStatus} />
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <span className="crumb">BastionLoop</span>
              {meta.sectionLabel !== meta.label && (
                <>
                  <Icon name="chevron-right" size={12} className="crumb-separator" />
                  <span className="crumb">{meta.sectionLabel}</span>
                </>
              )}
              <Icon name="chevron-right" size={12} className="crumb-separator" />
              <span className="topbar-title">{meta.label}</span>
            </div>
            <div className="topbar-right">
              <button className="search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
                <Icon name="search" size={14} />
                <span>Search</span>
                <kbd>Ctrl K</kbd>
              </button>
              <button
                className="icon-button"
                title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                <Icon name={theme === "light" ? "moon" : "sun"} size={15} />
              </button>
              <button
                className={`icon-button ${route === "settings" ? "active" : ""}`}
                title="Settings"
                aria-label="Settings"
                onClick={() => navigate("settings")}
              >
                <Icon name="settings" size={15} />
              </button>
            </div>
          </div>
        </header>

        {SUBNAV[meta.section] && (
          <div className="subnav" role="navigation" aria-label={`${meta.sectionLabel} views`}>
            <div className="subnav-inner">
              {SUBNAV[meta.section].map((tab) => (
                <button
                  key={tab.route}
                  className={`subnav-item ${route === tab.route ? "active" : ""}`}
                  onClick={() => navigate(tab.route)}
                  aria-current={route === tab.route ? "page" : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {health.error && (
          <div className="content-alert">
            <ErrorBanner
              title="Gateway disconnected"
              message={`${health.error}. Data below may be stale.`}
              onRetry={health.refresh}
            />
          </div>
        )}

        <div className="content">{page}</div>

        <footer className="footer">
          <span>BastionLoop · evidence workbench</span>
          <span className="footer-status">
            <StatusPill
              status={
                verified
                  ? "verified"
                  : integrity.error
                    ? "disconnected"
                    : integrityLoading
                      ? "checking"
                      : integrity.data
                        ? "failed"
                        : "untested"
              }
              label={
                integrity.error
                  ? "GATEWAY DISCONNECTED"
                  : integrityLoading
                    ? "CHECKING EVIDENCE"
                    : verified
                      ? "LEDGER VERIFIED"
                      : integrity.data
                        ? "LEDGER FAILED"
                        : "NO EVIDENCE"
              }
            />
          </span>
          <span className="mono">
            gateway {healthLoading ? "checking" : health.data?.gateway_image ?? "unknown"}
          </span>
        </footer>
      </main>

      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
