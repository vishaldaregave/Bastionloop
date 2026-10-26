import { useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { TimingChart, OverheadChart } from "../components/Charts";
import { Card, EvidenceValue, Empty, ErrorBanner, ModeSwitch, SectionTitle, Spinner, StatusPill } from "../components/UI";

export function Overview({ navigate }: { navigate: (route: string) => void }) {
  const overview = usePolling(() => api.get<any>("/v1/dashboard/overview"), 3000);
  const findings = usePolling(() => api.get<any>("/v1/findings"), 5000);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const data = overview.data;
  const integrity = data?.integrity;
  const verified = integrity?.status === "VERIFIED";
  const headSeq = integrity?.head?.seq ?? 0;
  const evidenceId = headSeq ? `ledger:${headSeq}` : null;
  const evidenceStatus = !data ? "untested" : verified ? "verified" : "unverified";
  const mode = data?.mode ?? "hardened";
  const timing = data?.timing ?? {};
  const hardenedP = timing?.hardened?.distinguishability?.p_value;

  async function changeMode(next: "hardened" | "naive") {
    setBusy(true);
    setNote(null);
    try {
      await api.post("/v1/demo/mode", { mode: next });
      await overview.refresh();
      setNote(`Arena switched to ${next === "naive" ? "the deliberate naive baseline" : "BastionLoop hardened mode"}.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function quickRun() {
    setBusy(true);
    setNote("Running six attacks, building findings and signed checkpoints...");
    try {
      const run = await api.post<any>("/v1/runs", {
        benchmark_id: "jailbreakbench-subset.v1",
        mode,
        max_cases: 6,
        tenant_id: "red",
      });
      await api.post(`/v1/runs/${run.run_id}/start?sync=true`);
      await Promise.all([overview.refresh(), findings.refresh()]);
      setNote(`Run ${run.run_id} complete. Open Findings to inspect its proof.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle hint="Every number below is bound to a ledger event or a verifier response. No receipt, no number.">
        Proof, not paint.
      </SectionTitle>

      {overview.error && <ErrorBanner message={overview.error} onRetry={overview.refresh} />}

      <section className="hero">
        <div>
          <span className="hero-kicker">PROOF-CARRYING FINDINGS · BAYORA PROBLEM 04</span>
          <h1>
            Most platforms ask you to trust their dashboard.
            <br />
            <em>We hand you a file you can verify offline.</em>
          </h1>
          <p>
            BastionLoop attaches machine-checkable isolation proof to every finding: commit-reveal payloads,
            per-session model freshness, six-channel canaries, signed checkpoints, a witness co-signature and an
            external anchor. The dashboard is a viewer. The artifact is the proof.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={quickRun} disabled={busy}>
              {busy ? <Spinner label="Running" /> : "Run a proof-backed evaluation"}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("judge")}>
              Judge challenge
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("verifier")}>
              Verify a PCF in your browser
            </button>
          </div>
          {note && <div className="note-line">{note}</div>}
        </div>
        <div className="hero-side">
          <ModeSwitch mode={mode} onChange={changeMode} busy={busy} />
          <div className={`integrity-card ${verified ? "ok" : "bad"}`}>
            <div className="integrity-top">
              <span>Evidence integrity</span>
              <StatusPill status={verified ? "verified" : data ? "failed" : "untested"} />
            </div>
            <strong>{verified ? "Ledger verified" : data ? "Verification failed" : "No evidence yet"}</strong>
            <span className="mono">
              {integrity?.counts?.events ?? 0} events · {integrity?.counts?.checkpoints ?? 0} checkpoints ·{" "}
              {integrity?.counts?.anchor_entries ?? 0} anchors
            </span>
            {integrity?.issues?.length > 0 && (
              <span className="integrity-issue mono">{integrity.issues[0].code}: {integrity.issues[0].detail}</span>
            )}
            <span className="integrity-link" onClick={() => navigate("audit")}>
              Open audit explorer →
            </span>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <Card className="stat" title="Runs" subtitle="created in this arena">
          <div className="stat-value">
            <EvidenceValue value={data?.runs?.total ?? 0} evidenceId={evidenceId} status={evidenceStatus} />
          </div>
          <div className="stat-foot">
            <span>{data?.runs?.active ?? 0} active</span>
            <span>{data?.runs?.failed ?? 0} failed</span>
          </div>
        </Card>
        <Card className="stat" title="Signed findings" subtitle="PCF bundles">
          <div className="stat-value">
            <EvidenceValue value={data?.findings ?? 0} evidenceId={evidenceId} status={evidenceStatus} />
          </div>
          <div className="stat-foot">
            <span>verifier-backed</span>
            <span>{findings.data?.findings?.filter((f: any) => f.status === "signed").length ?? 0} signed</span>
          </div>
        </Card>
        <Card className="stat" title="Ledger events" subtitle="append-only">
          <div className="stat-value">
            <EvidenceValue value={integrity?.counts?.events ?? 0} evidenceId={evidenceId} status={evidenceStatus} />
          </div>
          <div className="stat-foot">
            <span>{data?.events?.denied ?? 0} denied</span>
            <span>{data?.events?.canary_violations ?? 0} canary leaks</span>
          </div>
        </Card>
        <Card className="stat" title="Signed checkpoints" subtitle="signer + witness">
          <div className="stat-value">
            <EvidenceValue value={integrity?.counts?.checkpoints ?? 0} evidenceId={evidenceId} status={evidenceStatus} />
          </div>
          <div className="stat-foot">
            <span>{integrity?.counts?.anchor_entries ?? 0} anchored</span>
            <span>{integrity?.issues?.filter((i: any) => i.severity === "warn").length ?? 0} warnings</span>
          </div>
        </Card>
        <Card className="stat" title="Timing leakage" subtitle="Mann-Whitney, allow vs block">
          <div className="stat-value small">
            {hardenedP === undefined ? (
              <EvidenceValue value="" status="untested" detail="Not enough samples" />
            ) : (
              <EvidenceValue value={`p = ${hardenedP}`} evidenceId="TIM-01" status={hardenedP > 0.05 ? "verified" : "unverified"} />
            )}
          </div>
          <div className="stat-foot">
            <span>bucket {timing?.padding_bucket_ms ?? 0}ms</span>
            <span>naive p = {timing?.naive?.distinguishability?.p_value ?? "n/a"}</span>
          </div>
        </Card>
        <Card className="stat" title="Mode" subtitle="global demo baseline">
          <div className="stat-value small">
            <StatusPill status={mode} label={mode === "naive" ? "NAIVE" : "HARDENED"} />
          </div>
          <div className="stat-foot">
            <span>{data?.runtime ?? "local"} runtime</span>
            <span>{data?.policy?.version ?? "policy?"}</span>
          </div>
        </Card>
      </div>

      <div className="two-col">
        <Card
          title="Verdict timing"
          subtitle="Can Red tell allow from block by latency?"
          actions={<StatusPill status={hardenedP === undefined ? "untested" : hardenedP > 0.05 ? "pass" : "fail"} />}
        >
          <TimingChart timing={timing} />
          <p className="card-foot">
            Hardened verdicts are padded to a fixed bucket. The p-value is computed from the arena's own samples,
            not asserted. If there are not enough samples, it says UNTESTED.
          </p>
        </Card>
        <Card title="Gateway overhead" subtitle="raw model time vs mediation cost">
          <OverheadChart overhead={timing?.overhead} />
          <p className="card-foot">
            Overhead is measured per request as total gateway time minus model inference time. Raw LLM variance remains a
            residual risk and is listed in the Trust Report.
          </p>
        </Card>
      </div>

      <div className="two-col">
        <Card title="Recent runs" subtitle="computed from executed tests" actions={<button className="btn btn-ghost btn-xs" onClick={() => navigate("red")}>Red lab →</button>}>
          {!data?.runs?.recent?.length && <Empty>No runs yet. Start one from the Red lab.</Empty>}
          {data?.runs?.recent?.map((run: any) => (
            <div key={run.run_id} className="list-row">
              <div>
                <div className="mono strong">{run.run_id}</div>
                <div className="muted">
                  {run.benchmark_id} · {run.case_count} cases · {run.model_id}
                </div>
              </div>
              <div className="list-meta">
                <StatusPill status={run.status} />
                <StatusPill status={run.mode} />
                <span className="mono">{Object.entries(run.decisions).map(([k, v]) => `${k}:${v}`).join(" ")}</span>
                <span className="mono">{run.findings?.length ?? 0} findings</span>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Latest findings" subtitle="each has a PCF" actions={<button className="btn btn-ghost btn-xs" onClick={() => navigate("findings")}>All findings →</button>}>
          {!findings.data?.findings?.length && <Empty>No findings yet. Run the naive baseline or a model-safety case.</Empty>}
          {findings.data?.findings?.slice(0, 5).map((finding: any) => (
            <div key={finding.finding_id} className="list-row">
              <div>
                <div className="mono strong">{finding.finding_id}</div>
                <div className="muted">{finding.finding_type} · {finding.case_id}</div>
              </div>
              <div className="list-meta">
                <span className={`sev sev-${finding.severity}`}>{finding.severity}</span>
                <StatusPill status={finding.status === "signed" ? "verified" : "fail"} label={finding.status?.toUpperCase()} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="The three demo moments" subtitle="If you only watch three things, watch these">
        <div className="demo-grid">
          <button className="demo-tile" onClick={() => navigate("isolation")}>
            <span className="demo-index">01</span>
            <strong>Same attacks, opposite outcome</strong>
            <p>Flip naive vs hardened. Watch six canary channels light up, then go dark. Watch the model session retrieve a prior canary in naive mode and stay clean in BastionLoop.</p>
            <span className="link">Open the isolation map →</span>
          </button>
          <button className="demo-tile" onClick={() => navigate("audit")}>
            <span className="demo-index">02</span>
            <strong>Break the evidence</strong>
            <p>Edit one event, re-chain the ledger, or truncate the tail. The verifier names the first broken link; the external anchor catches a re-chained truncation.</p>
            <span className="link">Open the audit explorer →</span>
          </button>
          <button className="demo-tile" onClick={() => navigate("judge")}>
            <span className="demo-index">03</span>
            <strong>Let a judge attack it</strong>
            <p>Hand a judge a scoped Red shell with one goal: read Blue's canary. Every attempt becomes a signed ledger event, and the run ends with a PCF.</p>
            <span className="link">Start the judge challenge →</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
