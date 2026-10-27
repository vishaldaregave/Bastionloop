import { FormEvent, useState } from "react";
import { GATEWAY, setAdminToken } from "../api";
import { Icon } from "../components/Icon";

export function Login({ navigate }: { navigate: (route: string) => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Enter an operator bearer token.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${GATEWAY}/v1/ledger/verify`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (!response.ok) throw new Error(`Gateway rejected the token (HTTP ${response.status}).`);
      setAdminToken(token.trim());
      navigate("overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand">
        <div className="login-mark"><Icon name="shield" size={26} /></div>
        <h1>BASTIONLOOP AI LABORATORY</h1>
        <p>Proof-Carrying AI Safety Testing Infrastructure</p>
      </div>

      <form className="login-card" onSubmit={authenticate}>
        <label className="login-label">
          OPERATOR BEARER TOKEN
          <div className="login-input">
            <Icon name="key" size={15} />
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the admin bearer token"
              autoComplete="current-password"
              aria-label="Operator bearer token"
            />
          </div>
        </label>

        {localDev && (
          <button
            type="button"
            className="login-dev-account"
            onClick={() => setToken("dev-admin-token")}
          >
            <span><strong>Local development admin</strong><small>Development-only gateway credential</small></span>
            <span className="login-role">ADMIN / ALL</span>
          </button>
        )}

        {error && <div className="login-error" role="alert">{error}</div>}

        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "AUTHENTICATING…" : "AUTHENTICATE OPERATOR"}
          {!busy && <Icon name="arrow-right" size={15} />}
        </button>

        <p className="login-foot">
          The token is held in this browser and sent to the configured gateway. Capability scope is enforced by the
          signed policy bundle, not by this screen.
        </p>
      </form>

      <button className="login-back" onClick={() => navigate("overview")}>Continue to control plane</button>
      <small className="login-version">BastionLoop Control Plane v1.0 · local-first</small>
    </div>
  );
}
