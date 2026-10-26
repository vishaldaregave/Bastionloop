import { CodeBlock, CopyButton, Field, StatusPill } from "./UI";

export function PcfPanel({
  pcf,
  verification,
  onDownload,
  onBrowserVerify,
}: {
  pcf: any;
  verification: any;
  onDownload?: () => void;
  onBrowserVerify?: () => void;
}) {
  if (!pcf) return null;
  const status = verification?.status ?? "UNTESTED";
  const issues = verification?.issues ?? [];
  const chain = pcf.chain ?? {};
  const checkpoint = chain.checkpoint ?? {};
  const anchor = pcf.anchor?.entry ?? null;
  const freshness = pcf.model?.freshness_proof ?? {};
  const canary = pcf.canary_scan ?? {};
  const dlp = pcf.dlp ?? {};
  return (
    <div className="pcf">
      <div className="pcf-head">
        <div>
          <div className="pcf-kicker">PROOF-CARRYING FINDING</div>
          <h2>{pcf.finding_id}</h2>
          <p>
            <span className="mono">{pcf.finding_type}</span> · severity{" "}
            <span className={`sev sev-${pcf.severity}`}>{pcf.severity}</span> · run{" "}
            <span className="mono">{pcf.run?.run_id}</span>
          </p>
        </div>
        <div className="pcf-actions">
          <StatusPill status={status === "VERIFIED" ? "verified" : "failed"} label={status} />
          {onDownload && (
            <button className="btn btn-ghost btn-xs" onClick={onDownload}>
              Download PCF
            </button>
          )}
          {onBrowserVerify && (
            <button className="btn btn-primary btn-xs" onClick={onBrowserVerify}>
              Verify in browser
            </button>
          )}
        </div>
      </div>

      <div className="pcf-verdict">
        <Field label="Blue verdict" value={pcf.verdict?.decision} mono />
        <Field label="Isolation held" value={pcf.trust ? (pcf.finding_type === "cross-session-leak" ? "NO" : "YES") : "—"} />
        <Field label="Model" value={`${pcf.run?.adapter ?? "?"} / ${pcf.run?.model_id ?? "?"}`} mono />
        <Field label="Mode" value={pcf.run?.mode} />
        <Field label="Policy" value={`${pcf.policy?.version ?? "?"} · ${String(pcf.policy?.bundle_hash ?? "").slice(0, 12)}…`} mono />
        <Field label="Benchmark" value={`${pcf.run?.benchmark_id ?? "?"} @ ${pcf.run?.benchmark_version ?? "?"}`} mono />
      </div>

      <div className="pcf-grid">
        <div className="pcf-box">
          <h3>Chain position</h3>
          <Field label="Ledger seq" value={chain.seq} mono />
          <Field label="Event hash" value={<span className="mono ellipsis">{chain.event_hash}</span>} />
          <Field label="Checkpoint" value={`#${checkpoint.counter} covers seq ${checkpoint.upto_seq}`} mono />
          <Field label="Merkle root" value={<span className="mono ellipsis">{checkpoint.merkle_root}</span>} />
          <Field label="Anchor" value={anchor ? `#${anchor.counter} · ${String(anchor.anchor_hash).slice(0, 12)}…` : "not anchored"} mono />
        </div>
        <div className="pcf-box">
          <h3>Payload secrecy</h3>
          <Field label="Commitment" value={<span className="mono ellipsis">{pcf.payload?.commitment}</span>} />
          <Field label="Reveal hash" value={<span className="mono ellipsis">{pcf.payload?.payload_hash}</span>} />
          <Field label="Prompt hash" value={<span className="mono ellipsis">{pcf.attack?.prompt_hash}</span>} />
          <Field label="Response hash" value={<span className="mono ellipsis">{pcf.model?.response_hash}</span>} />
          <Field label="Session" value={pcf.model?.session_id} mono />
        </div>
        <div className="pcf-box">
          <h3>Freshness & canaries</h3>
          <Field label="Freshness probe" value={freshness.clean === true ? "clean" : freshness.clean === false ? "LEAK" : "unknown"} />
          <Field label="Canary channels" value={`${canary.channels_scanned?.length ?? 0} scanned / ${canary.channels_not_exercised?.length ?? 0} untested`} mono />
          <Field label="Canary leaks" value={canary.leaks?.length ?? 0} mono />
          <Field label="DLP" value={dlp.clean ? "clean" : `${dlp.hits?.length ?? 0} hit(s)`} />
          <Field label="Gateway image" value={<span className="mono ellipsis">{pcf.images?.gateway}</span>} />
        </div>
      </div>

      {issues.length > 0 && (
        <div className="pcf-issues">
          <h3>Verifier issues</h3>
          {issues.map((issue: any, index: number) => (
            <div key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
              <span className="mono">{issue.code}</span>
              <span>{issue.detail}</span>
            </div>
          ))}
        </div>
      )}

      <details className="details">
        <summary>Non-claims attached to this finding</summary>
        <ul className="clean-list">
          {(pcf.trust?.non_claims ?? []).map((claim: string) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
      </details>

      <details className="details">
        <summary>Raw PCF</summary>
        <div className="pcf-raw">
          <CopyButton value={JSON.stringify(pcf, null, 2)} label="Copy JSON" />
          <CodeBlock value={pcf} maxHeight={360} />
        </div>
      </details>
    </div>
  );
}
