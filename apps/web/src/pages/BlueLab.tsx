import { useEffect, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { PcfPanel } from "../components/PcfPanel";
import { Card, Empty, ErrorBanner, Field, SectionTitle, StatusPill } from "../components/UI";

export function BlueLab({ navigate }: { navigate: (route: string) => void }) {
  const blue = usePolling(() => api.get<any>("/v1/labs/blue"), 4000);
  const findings = usePolling(() => api.get<any>("/v1/findings"), 5000);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!selected && findings.data?.findings?.length) setSelected(findings.data.findings[0].finding_id);
  }, [findings.data, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    api
      .get<any>(`/v1/findings/${encodeURIComponent(selected)}?verify=true`)
      .then((document) => {
        if (!cancelled) setDetail(document);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const data = blue.data;
  const verdicts = data?.verdicts ?? {};

  return (
    <div className="page">
      <SectionTitle hint="Blue runs sealed. It returns a verdict and a score; it never returns its rules to Red in hardened mode.">
        Blue lab
      </SectionTitle>

      {blue.error && <ErrorBanner message={blue.error} onRetry={blue.refresh} />}

      <div className="stat-grid three">
        <Card title="Cell" subtitle="egress policy">
          <div className="big-status">
            <StatusPill status="verified" label={data?.sealed ? "SEALED" : "UNKNOWN"} />
          </div>
          <Field label="Defence version" value={data?.defence_version} mono />
          <Field label="Rules visible to Red" value={data?.rules_visible ? "YES (naive baseline)" : "NO"} />
        </Card>
        <Card title="Verdicts" subtitle="from executed runs">
          <div className="verdict-grid">
            {Object.keys(verdicts).length === 0 && <Empty>No verdicts yet.</Empty>}
            {Object.entries(verdicts).map(([decision, count]) => (
              <div key={decision} className="verdict-cell">
                <StatusPill status={decision === "allow" ? "allow" : "blocked"} label={decision.toUpperCase()} />
                <strong>{Number(count)}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Released findings" subtitle="after finalization">
          <div className="big-number">{data?.released_findings ?? 0}</div>
          <p className="card-foot">Findings are released only after the run is finalized and the payload is revealed.</p>
        </Card>
      </div>

      {data?.defence_rules && (
        <Card title="Leaked defence rules" subtitle="Visible only because the arena is deliberately in naive mode" tone="danger">
          <pre className="code">{JSON.stringify(data.defence_rules, null, 2)}</pre>
        </Card>
      )}

      <div className="two-col">
        <Card title="Findings released to Blue" subtitle="Each opens as a signed PCF">
          {!findings.data?.findings?.length && <Empty>No findings yet.</Empty>}
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
                  <StatusPill status={finding.status === "signed" ? "verified" : "fail"} label={finding.status?.toUpperCase()} />
                </div>
              </button>
            ))}
          </div>
        </Card>
        <Card title="What Blue never sees" subtitle="The secrecy claim">
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
      </div>

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
