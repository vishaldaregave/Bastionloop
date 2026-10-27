import { useMemo, useRef, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import {
  Card,
  CodeBlock,
  Empty,
  ErrorBanner,
  Field,
  Loading,
  SectionTitle,
  Spinner,
  StatusPill,
} from "../components/UI";

const TAMPER_MODES = [
  { id: "edit", label: "Edit one event" },
  { id: "edit-rechain", label: "Edit + re-chain" },
  { id: "delete", label: "Delete an event" },
  { id: "reorder", label: "Reorder events" },
  { id: "truncate", label: "Truncate tail" },
  { id: "truncate-rechain", label: "Truncate + re-chain" },
];

export function Audit({ navigate }: { navigate: (route: string) => void }) {
  const events = usePolling(() => api.get<any>("/v1/events?limit=300"), 3000);
  const integrity = usePolling(() => api.get<any>("/v1/ledger/verify"), 6000);
  const [filter, setFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [tamperBusy, setTamperBusy] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadedPcf, setUploadedPcf] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const items = events.data?.events ?? [];
    if (!filter.trim()) return items;
    const needle = filter.toLowerCase();
    return items.filter((event: any) =>
      `${event.event_type} ${event.tenant_id} ${event.run_id} ${JSON.stringify(event.metadata)}`
        .toLowerCase()
        .includes(needle),
    );
  }, [events.data, filter]);

  const status = integrity.error ? "DISCONNECTED" : integrity.data?.status;
  const verified = status === "VERIFIED";

  async function verifyNow() {
    setVerifyBusy(true);
    try {
      await integrity.refresh();
    } finally {
      setVerifyBusy(false);
    }
  }

  async function exportLedger() {
    try {
      await api.download("/v1/ledger/export", "bastionloop-ledger.json");
    } catch (err) {
      setTamperResult({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function tamper(mode: string) {
    setTamperBusy(mode);
    setTamperResult(null);
    try {
      const result = await api.post<any>("/v1/admin/tamper", { mode });
      setTamperResult(result);
      await integrity.refresh();
    } catch (err) {
      setTamperResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTamperBusy(null);
    }
  }

  async function uploadPcf(file: File) {
    setUploadBusy(true);
    setUploadResult(null);
    try {
      const text = await file.text();
      const document = JSON.parse(text);
      setUploadedPcf(document);
      const result = await api.post<any>("/v1/verify/pcf", { pcf: document });
      setUploadResult(result);
    } catch (err) {
      setUploadResult({ status: "FAILED", verified: false, issues: [{ code: "upload", severity: "fatal", detail: String(err) }] });
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle hint="Append-only evidence, verifier results and controlled tamper tests. Technical provenance stays available on demand.">
        Evidence & PCFs
      </SectionTitle>

      {(events.error || integrity.error) && (
        <ErrorBanner message={events.error || integrity.error || ""} onRetry={() => { void events.refresh(); void integrity.refresh(); }} />
      )}

      <div className={`integrity-hero ${verified ? "ok" : integrity.data || integrity.error ? "bad" : ""}`}>
        <div>
          <span className="hero-kicker">EVIDENCE INTEGRITY</span>
          <h2>
            {verified
              ? "Chain verified"
              : integrity.error
                ? "Ledger disconnected"
                : integrity.loading && !integrity.data
                  ? "Checking evidence…"
                  : status === "FAILED"
                    ? "Verification failed"
                    : "No evidence"}
          </h2>
          <p className="mono">
            {integrity.data?.counts?.events ?? 0} events · {integrity.data?.counts?.checkpoints ?? 0} checkpoints ·{" "}
            {integrity.data?.counts?.anchor_entries ?? 0} anchor entries
          </p>
          {integrity.data?.first_broken_link && (
            <p className="mono danger">
              first broken link: seq {integrity.data.first_broken_link.seq} ({integrity.data.first_broken_link.reason})
            </p>
          )}
        </div>
        <div className="row-actions">
          <StatusPill
            status={verified ? "verified" : integrity.error ? "disconnected" : status === "FAILED" ? "failed" : "untested"}
          />
          <button className="btn btn-ghost btn-xs" onClick={verifyNow} disabled={verifyBusy}>
            {verifyBusy ? <Spinner label="Verifying" /> : "Verify again"}
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => void exportLedger()}>
            Export ledger
          </button>
        </div>
      </div>

      {integrity.data?.issues?.length > 0 && (
        <Card title="Verifier issues" subtitle="Warnings are shown, not hidden" tone={verified ? undefined : "danger"}>
          {integrity.data.issues.map((issue: any, index: number) => (
            <div key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
              <span className="mono">{issue.code}</span>
              <span>{issue.detail}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="two-col">
        <Card title="Tamper simulator" subtitle="Runs on an in-memory copy of exported evidence, never the live ledger">
          <div className="tamper-grid">
            {TAMPER_MODES.map((mode) => (
              <button
                key={mode.id}
                className="btn btn-danger-ghost btn-xs"
                disabled={Boolean(tamperBusy) || !integrity.data || Boolean(integrity.error)}
                onClick={() => tamper(mode.id)}
              >
                {tamperBusy === mode.id ? <Spinner label="Tampering" /> : mode.label}
              </button>
            ))}
          </div>
          {tamperResult?.error && <div className="error-banner">{tamperResult.error}</div>}
          {tamperResult && !tamperResult.error && (
            <div className="tamper-result">
              <div className="tamper-judgement">
                <div>
                  <span className="field-label">Before</span>
                  <StatusPill status={tamperResult.before?.status === "VERIFIED" ? "verified" : "failed"} label={tamperResult.before?.status} />
                </div>
                <span className="arrow">→</span>
                <div>
                  <span className="field-label">After</span>
                  <StatusPill status={tamperResult.after?.status === "VERIFIED" ? "verified" : "failed"} label={tamperResult.after?.status} />
                </div>
              </div>
              <p className="muted small">{tamperResult.explanation}</p>
              {tamperResult.after?.first_broken_link && (
                <div className="mono danger">
                  broken at seq {tamperResult.after.first_broken_link.seq}: {tamperResult.after.first_broken_link.reason}
                </div>
              )}
              <div className="issue-list">
                {(tamperResult.after?.issues ?? []).map((issue: any, index: number) => (
                  <div key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
                    <span className="mono">{issue.code}</span>
                    <span>{issue.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="card-foot">
            Why a hash chain is not enough: an admin with database control can rewrite the whole chain. The witness
            co-signature and external anchor are what make a re-chained truncation visible.
          </p>
        </Card>

        <Card title="Verify any PCF" subtitle="Drop a bundle; the arena verifies it in Python">
          <input
            ref={fileRef}
            type="file"
            aria-label="Choose a PCF JSON file to verify"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPcf(file);
            }}
          />
          <div
            className="dropzone"
            role="button"
            tabIndex={0}
            aria-label="Choose a PCF JSON file to verify"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileRef.current?.click();
              }
            }}
          >
            {uploadBusy ? <Spinner label="Verifying" /> : "Click to choose a PCF JSON file"}
          </div>
          {uploadResult && (
            <div className="upload-result">
              <StatusPill
                status={uploadResult.status === "VERIFIED" ? "verified" : uploadResult.status === "FAILED" ? "failed" : "untested"}
                label={uploadResult.status ?? "UNKNOWN"}
              />
              {uploadResult.anchor_source && (
                <div className="mono tiny muted">
                  anchor source: {uploadResult.anchor_source} · independent:{" "}
                  {uploadResult.independent_verification === true ? "yes" : uploadResult.independent_verification === false ? "no" : "unknown"}
                </div>
              )}
              {uploadResult.first_broken_link && (
                <div className="mono danger">
                  first broken link: seq {uploadResult.first_broken_link.seq} ({uploadResult.first_broken_link.reason})
                </div>
              )}
              {(uploadResult.issues ?? []).length > 0 && (
                <div className="issue-list">
                  {uploadResult.issues.map((issue: any, index: number) => (
                    <div key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
                      <span className="mono">{issue.code}</span>
                      <span>{issue.detail}</span>
                    </div>
                  ))}
                </div>
              )}
              {uploadedPcf && (
                <button
                  className="btn btn-primary btn-xs"
                  onClick={() => {
                    sessionStorage.setItem("bastionloop.pcf", JSON.stringify(uploadedPcf));
                    navigate("verifier");
                  }}
                >
                  Open in browser verifier
                </button>
              )}
            </div>
          )}
          <p className="card-foot">
            The browser verifier recomputes Ed25519 signatures, the hash chain, the Merkle checkpoint and the anchor
            without calling the Python verifier. Use it when the judge does not trust this server.
          </p>
        </Card>
      </div>

      <Card
        title="Event timeline"
        subtitle="Metadata only: hashes, sizes, verdicts, latency. Raw payloads stay in tenant storage."
          actions={
          <input
            className="input compact"
            aria-label="Filter evidence events"
            placeholder="Filter events…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        }
      >
        {events.loading && !events.data && <Loading label="Loading evidence timeline" />}
        {!events.loading && filtered.length === 0 && <Empty>{filter ? "No events match the filter." : "No events yet."}</Empty>}
        <div className="table-wrap">
          <table className="table events-table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Time</th>
                <th>Type</th>
                <th>Tenant</th>
                <th>Run</th>
                <th>Event hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice().reverse().map((event: any) => (
                <tr
                  key={event.event_id}
                  onClick={() => setSelectedEvent(event)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                      keyEvent.preventDefault();
                      setSelectedEvent(event);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Inspect event ${event.seq} ${event.event_type}`}
                  className={selectedEvent?.seq === event.seq ? "selected" : ""}
                >
                  <td className="mono">{event.seq}</td>
                  <td className="mono tiny">{new Date(event.ts).toLocaleTimeString()}</td>
                  <td><span className="event-type">{event.event_type}</span></td>
                  <td>{event.tenant_id}</td>
                  <td className="mono tiny">{event.run_id ?? "—"}</td>
                  <td className="mono tiny ellipsis">{event.event_hash?.slice(0, 22)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedEvent && (
        <Card
          title={`Event #${selectedEvent.seq}`}
          subtitle={selectedEvent.event_type}
          actions={<button className="btn btn-ghost btn-xs" onClick={() => setSelectedEvent(null)}>Close</button>}
        >
          <div className="detail-grid">
            <Field label="Event id" value={selectedEvent.event_id} mono />
            <Field label="Timestamp" value={selectedEvent.ts} mono />
            <Field label="Tenant" value={selectedEvent.tenant_id} />
            <Field label="Run" value={selectedEvent.run_id ?? "—"} mono />
            <Field label="Policy version" value={selectedEvent.policy_version ?? "—"} mono />
            <Field label="Previous hash" value={<span className="mono ellipsis">{selectedEvent.prev_hash}</span>} />
            <Field label="Event hash" value={<span className="mono ellipsis">{selectedEvent.event_hash}</span>} />
          </div>
          <CodeBlock value={selectedEvent.metadata} maxHeight={320} />
        </Card>
      )}
    </div>
  );
}
