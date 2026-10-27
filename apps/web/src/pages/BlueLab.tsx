import { useEffect, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { PcfPanel } from "../components/PcfPanel";
import { Card, Empty, ErrorBanner, Field, Loading, SectionTitle, StatusPill } from "../components/UI";

export function BlueLab({ navigate }: { navigate: (route: string) => void }) {
  const blue = usePolling(() => api.get<any>("/v1/labs/blue"), 4000);
  const findings = usePolling(() => api.get<any>("/v1/findings"), 5000);
  const runs = usePolling(() => api.get<any>("/v1/runs"), 3000);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && findings.data?.findings?.length) setSelected(findings.data.findings[0].finding_id);
  }, [findings.data, selected]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    api
      .get<any>(`/v1/findings/${encodeURIComponent(selected)}?verify=true`)
      .then((document) => {
        if (!cancelled) setDetail(document);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const data = blue.data;
  const verdicts = data?.verdicts ?? {};
  const blueHealth = data?.blue_health;
  const blueConnected = blueHealth?.status === "ok";

  return (
    <div className="page">
      <SectionTitle hint="Blue is designed to run sealed. The badge reports live reachability; it does not infer health from configuration.">
        Blue Lab
      </SectionTitle>

      {(blue.error || findings.error || runs.error || detailError) && (
        <ErrorBanner
          message={blue.error || findings.error || runs.error || detailError || ""}
          onRetry={() => {
            void blue.refresh();
            void findings.refresh();
            void runs.refresh();
          }}
        />
      )}
      {blue.loading && !data && <Loading label="Loading Blue cell state" />}

      <div className="stat-grid three">
        <Card title="Cell" subtitle="live health, not an assumed seal">
          <div className="big-status">
            <StatusPill
              status={blueConnected ? "pass" : data ? "disconnected" : "untested"}
              label={blueConnected ? "REACHABLE" : data ? "UNAVAILABLE" : "UNKNOWN"}
            />
          </div>
          <Field label="Defence version" value={data?.defence_version ?? "unknown"} mono />
          <Field label="Sealed policy" value={data?.sealed === true ? "configured" : "unknown"} />
          <Field label="Rules visible to Red" value={data?.rules_visible === true ? "YES (naive baseline)" : data?.rules_visible === false ? "NO" : "unknown"} />
        </Card>
        <Card title="Verdicts" subtitle="from executed runs">
          <div className="verdict-grid">
            {!data && <Empty>Waiting for the Blue lab response.</Empty>}
            {data && Object.keys(verdicts).length === 0 && <Empty>No verdicts yet.</Empty>}
            {Object.entries(verdicts).map(([decision, count]) => (
              <div key={decision} className="verdict-cell">
                <StatusPill
                  status={decision === "allow" ? "allow" : decision === "block" ? "blocked" : "untested"}
                  label={decision.toUpperCase()}
                />
                <strong>{Number(count)}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Released findings" subtitle="after finalization">
          <div className="big-number">{data ? data.released_findings ?? 0 : "—"}</div>
          <p className="card-foot">
            {data
              ? "Findings are released only after the run is finalized and the payload is revealed."
              : "Waiting for the Blue lab response; this is not zero findings."}
          </p>
        </Card>
      </div>

      {data?.defence_rules && (
        <Card title="Leaked defence rules" subtitle="Visible only because the arena is deliberately in naive mode" tone="danger">
          <pre className="code">{JSON.stringify(data.defence_rules, null, 2)}</pre>
        </Card>
      )}

      <div className="two-col">
        <Card title="Recent runs" subtitle="Defence sees finalized run state, not live payloads">
          {runs.loading && !runs.data && <Loading label="Loading run state" />}
          {!runs.loading && !runs.data?.runs?.length && <Empty>No runs yet.</Empty>}
          <div className="run-list">
            {(runs.data?.runs ?? []).slice(0, 6).map((run: any) => (
              <div key={run.run_id} className="run-item">
                <div className="run-top">
                  <span className="mono strong">{run.run_id}</span>
                  <StatusPill status={run.status} />
                </div>
                <div className="run-meta">
                  <StatusPill status={run.mode} />
                  <span className="mono">{run.case_count} cases</span>
                  <span className="mono">
                    {Object.entries(run.decisions ?? {}).map(([key, value]) => `${key}:${value}`).join(" · ") || "no verdicts"}
                  </span>
                  <span className="mono">{run.adapter ?? "adapter?"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Findings released to Blue" subtitle="Each opens as a signed PCF">
          {findings.loading && !findings.data && <Loading label="Loading findings" />}
          {!findings.loading && !findings.data?.findings?.length && <Empty>No findings yet.</Empty>}
          <div className="run-list">
            {findings.data?.findings?.map((finding: any) => (
              <button
                key={finding.finding_id}
                className={`run-item ${selected === finding.finding_id ? "selected" : ""}`}
                onClick={() => setSelected(finding.finding_id)}
              >
                <div className="run-top">
                  <span className="mono strong">{finding.finding_id}</span>
                  <span className={`sev sev-${finding.severity}`}>{finding.severity}</span>
                </div>
                <div className="run-meta">
                  <span>{finding.finding_type}</span>
                  <span className="mono">{finding.case_id}</span>
                  <span className="mono">{finding.adapter ?? "adapter?"}/{finding.model_id ?? "model?"}</span>
                  <span className="mono">{finding.benchmark_id ?? "benchmark?"} @ {finding.benchmark_version ?? "?"}</span>
                  <span className="mono">seq:{finding.chain_seq ?? "?"} · cp:{finding.checkpoint ?? "?"} · anchor:{finding.anchor_ref ?? "?"}</span>
                  <StatusPill
                    status={finding.status === "signed" ? "pass" : finding.status === "failed" ? "fail" : "untested"}
                    label={finding.status === "signed" ? "SIGNED" : finding.status?.toUpperCase() ?? "UNKNOWN"}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="What Blue never sees" subtitle="The configured secrecy boundary">
        <ul className="clean-list">
          <li>Raw Red payloads before release: Blue receives responses in micro-batches, not the prompt corpus.</li>
          <li>Signing material: the signer key never enters a tenant container.</li>
          <li>Red's canaries: Blue is only given its own canaries for output scanning.</li>
          <li>Other tenants' data: Blue can read released findings, not live runs.</li>
          <li>In naive mode this changes deliberately; that is the point of the baseline.</li>
        </ul>
        <button className="btn btn-ghost btn-xs" onClick={() => navigate("isolation")}>
          Compare modes →
        </button>
      </Card>

      {detailLoading && (
        <Card title="PCF verification" subtitle="Selected finding">
          <Loading label="Loading PCF and verification result" />
        </Card>
      )}

      {detail?.pcf && (
        <PcfPanel
          pcf={detail.pcf}
          verification={detail.verification}
          onDownload={() => {
            const blob = new Blob([JSON.stringify(detail.pcf, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${detail.pcf.finding_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onBrowserVerify={() => {
            sessionStorage.setItem("bastionloop.pcf", JSON.stringify(detail.pcf));
            navigate("verifier");
          }}
        />
      )}
    </div>
  );
}
