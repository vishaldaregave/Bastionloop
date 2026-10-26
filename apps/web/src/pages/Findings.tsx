import { useEffect, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { PcfPanel } from "../components/PcfPanel";
import { Card, Empty, ErrorBanner, SectionTitle, StatusPill } from "../components/UI";

export function Findings({ navigate }: { navigate: (route: string) => void }) {
  const findings = usePolling(() => api.get<any>("/v1/findings"), 4000);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && findings.data?.findings?.length) setSelected(findings.data.findings[0].finding_id);
  }, [findings.data, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setError(null);
    api
      .get<any>(`/v1/findings/${encodeURIComponent(selected)}?verify=true`)
      .then((document) => {
        if (!cancelled) setDetail(document);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const items = findings.data?.findings ?? [];

  function download() {
    if (!detail?.pcf) return;
    const blob = new Blob([JSON.stringify(detail.pcf, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.pcf.finding_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <SectionTitle hint="A finding is not a row in a database. It is a signed bundle that a third party can verify without trusting this dashboard.">
        Findings
      </SectionTitle>

      {(findings.error || error) && (
        <ErrorBanner
          message={findings.error || error || ""}
          onRetry={() => {
            void findings.refresh();
            if (selected) setSelected(selected);
          }}
        />
      )}

      <div className="findings-layout">
        <Card title="All PCFs" subtitle={`${items.length} signed bundles`}>
          {items.length === 0 && <Empty>No findings yet. Run a model-safety case or the naive baseline.</Empty>}
          <div className="run-list">
            {items.map((finding: any) => (
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

        <div className="finding-detail">
          {detail?.pcf ? (
            <PcfPanel
              pcf={detail.pcf}
              verification={detail.verification}
              onDownload={download}
              onBrowserVerify={() => {
                sessionStorage.setItem("bastionloop.pcf", JSON.stringify(detail.pcf));
                navigate("verifier");
              }}
            />
          ) : (
            <Card title="PCF inspector" subtitle="Select a finding">
              <Empty>No PCF selected.</Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
