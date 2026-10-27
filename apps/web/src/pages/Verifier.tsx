import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Card, CopyButton, Empty, Field, SectionTitle, Spinner, StatusPill } from "../components/UI";
import { verifyPcfInBrowser, type Check, type PinnedKeys } from "../verifier";

export function Verifier() {
  const [pcfText, setPcfText] = useState("");
  const [pcfName, setPcfName] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PinnedKeys | null>(null);
  const [pinnedSource, setPinnedSource] = useState<string>("none");
  const [pinnedLoading, setPinnedLoading] = useState(true);
  const [anchorEntries, setAnchorEntries] = useState<any[] | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [ok, setOk] = useState<boolean | null>(null);
  const [independent, setIndependent] = useState<boolean | null>(null);
  const [anchorSource, setAnchorSource] = useState<string | null>(null);
  const [documentMeta, setDocumentMeta] = useState<any>(null);
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
      .catch(() => setPinnedSource("unavailable"))
      .finally(() => setPinnedLoading(false));
    api
      .get<any>("/v1/anchor")
      .then((result) => setAnchorEntries(Array.isArray(result.entries) ? result.entries : []))
      .catch(() => setAnchorEntries(null));
  }, []);

  async function loadPcf(file: File) {
    setPcfText(await file.text());
    setPcfName(file.name);
    setChecks([]);
    setOk(null);
    setIndependent(null);
    setAnchorSource(null);
    setDocumentMeta(null);
  }

  async function loadPinned(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const normalized = parsed.keys ? parsed : { keys: parsed };
      setPinned(normalized);
      setPinnedSource(file.name);
      setChecks([]);
      setOk(null);
      setIndependent(null);
      setAnchorSource(null);
      setDocumentMeta(null);
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
      setDocumentMeta(document);
      let anchors = anchorEntries;
      try {
        const latest = await api.get<any>("/v1/anchor");
        anchors = Array.isArray(latest.entries) ? latest.entries : [];
        setAnchorEntries(anchors);
      } catch {
        anchors = anchorEntries;
      }
      const result = await verifyPcfInBrowser(
        document,
        pinned,
        anchors && anchors.length > 0 ? anchors : undefined,
      );
      setChecks(result.checks);
      setOk(result.ok);
      setIndependent(result.independent);
      setAnchorSource(result.anchorSource);
      setHead(result.head);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOk(false);
      setAnchorSource(null);
    } finally {
      setBusy(false);
    }
  }

  const passCount = checks.filter((check) => check.status === "pass").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;

  return (
    <div className="page">
      <SectionTitle hint="This page never calls the Python verifier. It recomputes signatures, the hash chain, checkpoints and the anchor in your browser.">
        Verification
      </SectionTitle>

      <div className="verify-layout">
        <div className="verify-inputs">
          <Card title="1. Drop a PCF" subtitle="The signed JSON bundle">
            <input
              ref={pcfInput}
              type="file"
              aria-label="Choose a PCF JSON file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadPcf(file);
              }}
            />
            <div
              className="dropzone"
              role="button"
              tabIndex={0}
              aria-label="Choose a PCF JSON file"
              onClick={() => pcfInput.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pcfInput.current?.click();
                }
              }}
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
                setIndependent(null);
                setAnchorSource(null);
                setDocumentMeta(null);
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
                    setIndependent(null);
                    setAnchorSource(null);
                    setDocumentMeta(null);
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
              aria-label="Choose a pinned-keys JSON file"
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
            {pinnedLoading && !pinned ? (
              <div className="loading-state"><Spinner label="Loading pinned keys" /></div>
            ) : pinned ? (
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
          {error && <div className="error-banner" role="alert">{error}</div>}
        </div>

        <div className="verify-output">
          <div className={`verify-verdict ${ok === null ? "idle" : ok ? "ok" : "bad"}`}>
            <span className="hero-kicker">BROWSER VERIFIER</span>
            <h1>
              {ok === null
                ? "Waiting for a PCF"
                : ok
                  ? independent
                    ? "VERIFIED"
                    : "VERIFIED · EMBEDDED ANCHOR"
                  : "FAILED"}
            </h1>
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
                  ? independent
                    ? "Every fatal check passed. The signature, chain, checkpoint and independently supplied anchor are consistent."
                    : "Every fatal check passed, but the anchor entries came from the PCF itself. This is internally consistent, not independently anchored."
                  : "At least one fatal check failed. Do not trust this finding."}
            </p>
          </div>

          {ok !== null && (
            <Card title="What was checked" subtitle="Signed object, trusted inputs and scope">
              <div className="detail-grid">
                <Field label="Finding" value={documentMeta?.finding_id ?? "unknown"} mono />
                <Field label="PCF version" value={documentMeta?.pcf_version ?? "unknown"} mono />
                <Field label="Pinned signer" value={pinned?.keys?.signer?.key_id ?? "missing"} mono />
                <Field label="PCF signer" value={documentMeta?.signatures?.signer?.key_id ?? "missing"} mono />
                <Field label="Pinned witness" value={pinned?.keys?.witness?.key_id ?? "missing"} mono />
                <Field label="Signature domain" value={documentMeta?.signatures?.signer?.domain ?? "missing"} mono />
                <Field label="Signature algorithm" value={documentMeta?.signatures?.signer?.algorithm ?? "missing"} mono />
                <Field
                  label="Signed bytes"
                  value={
                    documentMeta?.signatures?.signer?.payload_b64
                      ? `${documentMeta.signatures.signer.payload_b64.length} b64 chars`
                      : "recomputed canonical"
                  }
                  mono
                />
                <Field label="Anchor source" value={anchorSource ?? "missing"} mono />
                <Field label="Anchor entries" value={anchorEntries ? String(anchorEntries.length) : "unavailable"} mono />
                <Field label="Independent anchor" value={independent === true ? "yes" : independent === false ? "no" : "unknown"} />
                <Field label="Chain head" value={head ? `seq ${head.seq}` : "not verified"} mono />
                <Field label="Trusted key source" value={pinnedSource} />
                <Field label="Checks" value={`${passCount} passed · ${failCount} failed · ${warnCount} warnings`} mono />
              </div>
              <p className="card-foot">
                The pinned key IDs above are trust inputs supplied out of band. The PCF's own embedded public key, if
                present, is ignored. An embedded anchor is internally consistent but not an independent anchor claim.
              </p>
            </Card>
          )}

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
              <li>
                {independent
                  ? "Proves the checkpoint is recorded in the external anchor chain."
                  : "Checks anchor consistency against entries embedded in the PCF. Fetch the anchor service separately for an independent anchor claim."}
              </li>
              <li>Proves the revealed payload matches the pre-run commitment.</li>
              <li>Does not prove the host kernel, the pinned keys, or the model itself are uncompromised. Those are stated non-claims.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
