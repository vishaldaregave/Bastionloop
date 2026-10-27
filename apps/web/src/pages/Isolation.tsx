import { useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { CanaryHeatmap } from "../components/CanaryHeatmap";
import { IsolationMap } from "../components/IsolationMap";
import {
  Card,
  ErrorBanner,
  Loading,
  ModeSwitch,
  SectionTitle,
  Spinner,
  StatusPill,
} from "../components/UI";

export function Isolation() {
  const overview = usePolling(() => api.get<any>("/v1/dashboard/overview"), 3500);
  const isolation = usePolling(() => api.get<any>("/v1/dashboard/isolation"), 3500);
  const runs = usePolling(() => api.get<any>("/v1/runs"), 3500);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const mode = overview.data?.mode;
  const allRuns: any[] = runs.data?.runs ?? [];
  const hardened = allRuns.find((run) => run.mode === "hardened" && run.status === "complete");
  const naive = allRuns.find((run) => run.mode === "naive" && run.status === "complete");
  const attempts = isolation.data?.recent_attempts ?? [];

  async function changeMode(next: "hardened" | "naive") {
    if (!mode) return;
    setBusy(true);
    setNote(null);
    try {
      await api.post("/v1/demo/mode", { mode: next });
      await Promise.all([overview.refresh(), isolation.refresh()]);
      setNote(`Global mode: ${next}. Runs keep the mode they were created with.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runMode(runMode: "hardened" | "naive"): Promise<boolean> {
    setBusy(true);
    setNote(`Running six attacks in ${runMode} mode...`);
    try {
      const run = await api.post<any>("/v1/runs", {
        benchmark_id: "jailbreakbench-subset.v1",
        mode: runMode,
        max_cases: 6,
        tenant_id: "red",
      });
      await api.post(`/v1/runs/${run.run_id}/start?sync=true`);
      await Promise.all([overview.refresh(), isolation.refresh(), runs.refresh()]);
      setNote(`${runMode} run ${run.run_id} complete.`);
      return true;
    } catch (err) {
      setNote(`${runMode} run failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function runComparison() {
    setBusy(true);
    try {
      setNote("Running the hardened baseline...");
      if (!(await runMode("hardened"))) return;
      setNote("Running the deliberate naive baseline...");
      if (!(await runMode("naive"))) return;
      setNote("Both baselines complete. Compare the two heatmaps.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle hint="Container isolation boundaries, declared capability paths and executed boundary attempts — with untested controls left untested.">
        Sandbox Topology
      </SectionTitle>

      {(overview.error || isolation.error || runs.error) && (
        <ErrorBanner
          message={overview.error || isolation.error || runs.error || ""}
          onRetry={() => {
            void overview.refresh();
            void isolation.refresh();
            void runs.refresh();
          }}
        />
      )}

      <Card
        title="Naive vs Hardened"
        subtitle="The same attack corpus runs in both modes. Only the evidence changes."
        actions={
          <div className="row-actions">
            <ModeSwitch mode={mode ?? "hardened"} onChange={changeMode} busy={busy || !mode} />
            <button className="btn btn-primary btn-xs" onClick={runComparison} disabled={busy || !mode}>
              {busy ? <Spinner label="Running" /> : "Run both baselines"}
            </button>
          </div>
        }
      >
        {note && <div className="note-line">{note}</div>}
        {overview.loading && !overview.data && <Loading label="Loading run comparison" />}
        <div className="compare-grid">
          <div className="compare-col">
            <div className="compare-head">
              <span className="compare-title">Naive baseline</span>
              <StatusPill status="naive" />
            </div>
            <p className="muted small">One shared sandbox, one shared model context, no verdict padding, Blue logic exposed. This mode exists only to show what isolation changes.</p>
            {naive ? (
              <>
                <div className="compare-meta mono">
                  {naive.run_id} · {naive.case_count} cases · {naive.adapter ?? "adapter?"} · freshness{" "}
                  {naive.freshness?.clean === true ? "clean" : naive.freshness?.clean === false ? "LEAK" : "unknown"}
                </div>
                <CanaryHeatmap scan={naive.canary_scan} freshness={naive.freshness} mode="naive" />
              </>
            ) : (
              <div className="empty">No naive run yet. Run both baselines.</div>
            )}
          </div>
          <div className="compare-col">
            <div className="compare-head">
              <span className="compare-title">Hardened</span>
              <StatusPill status="hardened" />
            </div>
            <p className="muted small">Per-session model, sealed Blue, padded verdicts, signed evidence. This is the isolation claim the PCF proves.</p>
            {hardened ? (
              <>
                <div className="compare-meta mono">
                  {hardened.run_id} · {hardened.case_count} cases · {hardened.adapter ?? "adapter?"} · freshness{" "}
                  {hardened.freshness?.clean === true ? "clean" : hardened.freshness?.clean === false ? "LEAK" : "unknown"}
                </div>
                <CanaryHeatmap scan={hardened.canary_scan} freshness={hardened.freshness} mode="hardened" />
              </>
            ) : (
              <div className="empty">No hardened run yet. Run both baselines.</div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Boundary map" subtitle="Gateway-reported allowed/blocked paths, plus recorded attempts">
        <IsolationMap
          mode={mode}
          zones={isolation.data?.zones ?? []}
          allowedPaths={isolation.data?.allowed_paths ?? []}
          blockedPaths={isolation.data?.blocked_paths ?? []}
          recentAttempts={attempts}
          loading={isolation.loading}
          error={isolation.error}
        />
      </Card>

      <div className="two-col">
        <Card title="What the scanner actually covered" subtitle="Honest coverage, not a green check">
          <ul className="clean-list">
            <li>Filesystem: private canary files are planted per tenant and scanned for cross-tenant appearance.</li>
            <li>Model context: Session A plants a canary; Session B tries to retrieve it. The freshness probe is recorded in the PCF.</li>
            <li>Logs, egress and monitor payloads: scanned for canary commitments, never raw values.</li>
            <li>Network and environment: marked UNTESTED in local mode; executed by the red probe only under Compose container namespaces.</li>
            <li>Every leak is named by channel. Evidence stores commitments, not the canary itself.</li>
          </ul>
        </Card>
        <Card title="Run a single mode" subtitle="For a focused demo">
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => runMode("hardened")} disabled={busy}>
              Run hardened
            </button>
            <button className="btn btn-danger" onClick={() => runMode("naive")} disabled={busy}>
              Run naive
            </button>
          </div>
          <p className="card-foot">
            A naive run intentionally fails. Its failure is evidence, not a bug. A hardened run should show zero canary
            leaks and a clean model freshness probe. If either is false, the Trust Report says so.
          </p>
        </Card>
      </div>
    </div>
  );
}
