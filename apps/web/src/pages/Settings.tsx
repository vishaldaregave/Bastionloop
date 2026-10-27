import { useState } from "react";
import { adminToken, api, setAdminToken } from "../api";
import { usePolling } from "../hooks";
import { Icon } from "../components/Icon";
import { SectionTitle, StatusPill } from "../components/UI";

export function Settings({
  openPalette,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  openPalette: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const health = usePolling(() => api.get<any>("/v1/health"), 10000);
  const [token, setToken] = useState(adminToken());
  const [saved, setSaved] = useState(false);

  const services = health.data?.services ?? {};
  const unavailable = Object.entries(services).filter(([, value]: [string, any]) => value?.status !== "ok");
  const healthLoading = health.loading && !health.data;

  return (
    <div className="page settings-page">
      <SectionTitle hint="Platform appearance, operator access and live runtime governance. Browser preferences are local unless noted.">
        System Settings
      </SectionTitle>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Workspace</h2>
          <p>The midnight control-plane theme is fixed for the admin workspace.</p>
        </div>
        <div className="settings-row">
          <div className="settings-copy">
            <strong>Sidebar</strong>
            <span>Collapse to icons for a denser workspace.</span>
          </div>
          <button className="btn btn-secondary" onClick={onToggleSidebar}>
            <Icon name="panel" size={14} /> {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Gateway access</h2>
          <p>The dashboard uses this bearer token for its own API requests. Tenant and judge tokens remain scoped separately.</p>
        </div>
        <div className="settings-row">
          <div className="settings-copy">
            <strong>Admin bearer token</strong>
            <span>Stored in localStorage. Development defaults are rejected in production.</span>
          </div>
          <div className="settings-control">
            <input
              className="input"
              aria-label="Admin bearer token"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setSaved(false);
              }}
              placeholder="dev-admin-token"
              type="password"
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                setAdminToken(token);
                setSaved(true);
                void health.refresh();
              }}
            >
              Save
            </button>
          </div>
        </div>
        {saved && <div className="settings-note">Token saved for this browser. New API requests use it immediately.</div>}
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Keyboard</h2>
          <p>Shortcuts pause while typing in an input or textarea.</p>
        </div>
        <div className="shortcut-list">
          <button className="settings-row shortcut-row" onClick={openPalette}>
            <span className="settings-copy"><strong>Command palette</strong><span>Search pages and actions</span></span>
            <span className="shortcut-keys"><kbd>Ctrl</kbd><kbd>K</kbd></span>
          </button>
          <div className="settings-row shortcut-row">
            <span className="settings-copy"><strong>Navigate sections</strong><span>Overview, users, RBAC, evaluations, topology, logs, evidence, governance, passport, settings</span></span>
            <span className="shortcut-keys"><kbd>g</kbd><span>then</span><kbd>o</kbd><kbd>u</kbd><kbd>p</kbd><kbd>e</kbd><kbd>t</kbd><kbd>l</kbd><kbd>v</kbd><kbd>g</kbd><kbd>r</kbd><kbd>s</kbd></span>
          </div>
          <div className="settings-row shortcut-row">
            <span className="settings-copy"><strong>Close overlays</strong><span>Command palette and dialogs</span></span>
            <span className="shortcut-keys"><kbd>Esc</kbd></span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Runtime</h2>
          <p>Read-only values from the gateway health probe. Unavailable services are not inferred to be healthy.</p>
        </div>
        <div className="settings-grid">
          <div><span>Environment</span><strong>{healthLoading ? "checking" : health.data?.environment ?? "unknown"}</strong></div>
          <div><span>Mode</span><strong>{healthLoading ? "checking" : health.data?.mode ?? "unknown"}</strong></div>
          <div><span>Runtime</span><strong>{healthLoading ? "checking" : health.data?.runtime ?? "unknown"}</strong></div>
          <div><span>Model adapter</span><strong>{healthLoading ? "checking" : services.model?.adapter ?? "unknown"}</strong></div>
          <div><span>Policy</span><strong>{healthLoading ? "checking" : health.data?.policy?.version ?? "unknown"}</strong></div>
          <div><span>Gateway image</span><strong className="mono">{healthLoading ? "checking" : health.data?.gateway_image ?? "unknown"}</strong></div>
        </div>
        {health.data?.environment && health.data.environment !== "production" && (
          <div className="settings-note">
            {health.data.environment} runtime. Mock adapters and local demo controls may be in use; results are evidence
            of the tested configuration, not production readiness.
          </div>
        )}
        <div className="settings-service-row">
          <StatusPill
            status={health.error ? "disconnected" : healthLoading ? "checking" : unavailable.length === 0 ? "pass" : "warn"}
            label={
              health.error
                ? "GATEWAY DISCONNECTED"
                : healthLoading
                  ? "CHECKING SERVICES"
                  : unavailable.length === 0
                    ? "ALL SERVICES CONNECTED"
                    : `${unavailable.length} SERVICE(S) UNAVAILABLE`
            }
          />
          <button className="btn btn-ghost btn-xs" onClick={() => void health.refresh()}>
            <Icon name="refresh" size={13} /> Probe again
          </button>
        </div>
        {unavailable.length > 0 && (
          <div className="settings-note warn">
            {unavailable.map(([name]: [string, any]) => name).join(", ")} did not answer the latest health probe.
          </div>
        )}
        {health.error && <div className="settings-note danger">{health.error}</div>}
      </section>
    </div>
  );
}
