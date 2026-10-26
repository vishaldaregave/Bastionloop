import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Card, CopyButton, Empty, SectionTitle, Spinner, StatusPill } from "../components/UI";
import { verifyPcfInBrowser, type Check, type PinnedKeys } from "../verifier";

export function Verifier() {
  const [pcfText, setPcfText] = useState("");
  const [pcfName, setPcfName] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PinnedKeys | null>(null);
  const [pinnedSource, setPinnedSource] = useState<string>("none");
  const [checks, setChecks] = useState<Check[]>([]);
  const [ok, setOk] = useState<boolean | null>(null);
  const [head, setHead] = useState<{ seq: number; hash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pcfInput = useRef<HTMLInputElement>(null);
  const keyInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("bastionloop.pcf");
    if (saved) {
      setPcfText(saved);
      setPcfName("from-session");
    }
    api
      .get<any>("/v1/pinned-keys")
      .then((result) => {
        setPinned(result);
        setPinnedSource("gateway");
      })
      .catch(() => setPinnedSource("unavailable"));
  }, []);

  async function loadPcf(file: File) {
    setPcfText(await file.text());
    setPcfName(file.name);
    setChecks([]);
    setOk(null);
  }

  async function loadPinned(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const normalized = parsed.keys ? parsed : { keys: parsed };
      setPinned(normalized);
      setPinnedSource(file.name);
      setChecks([]);
      setOk(null);
    } catch (err) {
      setError(`Could not parse pinned keys: ${err}`);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      if (!pinned) throw new Error("No pinned keys. Fetch them or drop a pinned-keys.json file.");
      const document = JSON.parse(pcfText);
      const result = await verifyPcfInBrowser(document, pinned);
      setChecks(result.checks);
      setOk(result.ok);
      setHead(result.head);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOk(false);
    } finally {
      setBusy(false);
    }
  }

  const passCount = checks.filter((check) => check.status === "pass").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;

  return (
    <div className="page">
      <SectionTitle hint="This page never calls the Python verifier. It recomputes the Ed25519 signatures, hash chain, Merkle checkpoint and anchor in your browser with WebCrypto.">
        Verify it yourself.
      </SectionTitle>

      <div className="verify-layout">
        <div className="verify-inputs">
          <Card title="1. Drop a PCF" subtitle="The signed JSON bundle">
            <input
              ref={pcfInput}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadPcf(file);
              }}
            />
            <div
              className="dropzone"
              onClick={() => pcfInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) void loadPcf(file);
              }}
            >
              {pcfName ? `Loaded: ${pcfName}` : "Drop a PCF here, or click to choose"}
            </div>
            <textarea
              className="textarea mono small"
              rows={8}
              placeholder="…or paste the PCF JSON directly"
              value={pcfText}
              onChange={(event) => {
                setPcfText(event.target.value);
                setPcfName("pasted");
                setChecks([]);
                setOk(null);
              }}
            />
            <div className="row-actions">
              <CopyButton value={pcfText} label="Copy PCF" />
              {pcfText && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setPcfText("");
                    setPcfName(null);
                    setChecks([]);
                    setOk(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </Card>

          <Card title="2. Pin the keys" subtitle="Public keys, compared out of band">
            <input
              ref={keyInput}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadPinned(file);
              }}
            />
            <div className="pinned-row">
              <span className="muted">Source: <b>{pinnedSource}</b></span>
              <button className="btn btn-ghost btn-xs" onClick={() => keyInput.current?.click()}>
                Drop pinned-keys.json
              </button>
            </div>
            {pinned ? (
              <div className="key-list">
                {Object.entries(pinned.keys).map(([name, key]) => (
                  <div key={name} className="key-row">
                    <span className="mono strong">{name}</span>
                    <span className="mono small ellipsis">{key.key_id}</span>
                    <span className="mono tiny ellipsis">{key.public_key_b64}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No pinned keys loaded. Fetch from the gateway or drop a file.</Empty>
            )}
            <p className="card-foot">
              Fetching keys from the gateway is convenient, not maximal trust. For a hostile demo, export the keys on
              the presenter's machine and drop them here; compare the fingerprints on a printed card.
            </p>
          </Card>

          <button className="btn btn-primary verify-button" onClick={verify} disabled={busy || !pcfText || !pinned}>
            {busy ? <Spinner label="Recomputing" /> : "Verify in this browser"}
          </button>
          {error && <div className="error-banner">{error}</div>}
        </div>

        <div className="verify-output">
          <div className={`verify-verdict ${ok === null ? "idle" : ok ? "ok" : "bad"}`}>
            <span className="hero-kicker">BROWSER VERIFIER</span>
            <h1>{ok === null ? "Waiting for a PCF" : ok ? "VERIFIED" : "FAILED"}</h1>
            {head && <p className="mono">chain head seq {head.seq} · {head.hash?.slice(0, 24)}…</p>}
            {checks.length > 0 && (
              <p className="mono">
                {passCount} passed · {failCount} failed · {warnCount} warnings
              </p>
            )}
            <p className="verify-note">
              {ok === null
                ? "Verification is local. No signature, hash or Merkle root is trusted from the server."
                : ok
                  ? "Every fatal check passed. The bundle's signature, chain, checkpoint and anchor are internally consistent."
                  : "At least one fatal check failed. Do not trust this finding."}
            </p>
          </div>

          <div className="checks">
            {checks.length === 0 && (
              <Card title="Verification checklist" subtitle="Recomputed in your browser">
                <Empty>The checklist appears after verification.</Empty>
              </Card>
            )}
            {checks.map((check) => (
              <div key={check.id} className={`check check-${check.status}`}>
                <span className="check-icon">{check.status === "pass" ? "✓" : check.status === "fail" ? "✕" : "!"}</span>
                <div>
                  <div className="check-top">
                    <strong>{check.label}</strong>
                    <StatusPill status={check.status === "pass" ? "pass" : check.status === "fail" ? "fail" : "warn"} label={check.status.toUpperCase()} />
                  </div>
                  <span className="check-detail mono">{check.detail}</span>
                </div>
              </div>
            ))}
          </div>

          <Card title="What this proves" subtitle="And what it does not">
            <ul className="clean-list">
              <li>Proves the PCF was signed by the pinned signer key and has not been edited since signing.</li>
              <li>Proves the ledger events hash to the signed checkpoint and the checkpoint is cosigned by the pinned witness.</li>
              <li>Proves the checkpoint is recorded in the external anchor chain.</li>
              <li>Proves the revealed payload matches the pre-run commitment.</li>
              <li>Does not prove the host kernel, the pinned keys, or the model itself are uncompromised. Those are stated non-claims.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
