import { StatusPill } from "./UI";

const CHANNELS = [
  { id: "filesystem", label: "Filesystem", hint: "private canary file" },
  { id: "environment", label: "Environment", hint: "process env leak" },
  { id: "network", label: "Network", hint: "DNS / socket exfil" },
  { id: "logs", label: "Logs", hint: "log scraping" },
  { id: "model_context", label: "Model context", hint: "session contamination" },
  { id: "egress", label: "Egress", hint: "output DLP" },
];

export function CanaryHeatmap({
  scan,
  freshness,
  mode,
}: {
  scan: any;
  freshness: any;
  mode?: string;
}) {
  const leaks: any[] = Array.isArray(scan?.leaks) ? scan.leaks : [];
  const scanned: string[] = Array.isArray(scan?.channels_scanned) ? scan.channels_scanned : [];
  const planted: string[] = Array.isArray(scan?.channels_planted) ? scan.channels_planted : [];
  const notExercised: string[] = Array.isArray(scan?.channels_not_exercised) ? scan.channels_not_exercised : [];

  function channelState(channel: string): { status: "leak" | "clean" | "untested" | "warn"; detail: string } {
    const leak = leaks.find((item) => item.source_channel === channel || item.leak_channel === channel);
    if (leak) return { status: "leak", detail: `${leak.source_channel} → ${leak.leak_channel}` };
    if (channel === "model_context") {
      if (freshness?.clean === true) return { status: "clean", detail: "freshness probe clean" };
      if (freshness?.clean === false) return { status: "leak", detail: "prior context retrieved" };
      return { status: "untested", detail: "no freshness result" };
    }
    if (notExercised.includes(channel)) return { status: "untested", detail: "requires container namespaces" };
    if (scanned.includes(channel)) return { status: "clean", detail: "scanned, no leak" };
    if (planted.includes(channel)) return { status: "untested", detail: "planted, not scanned" };
    return { status: "untested", detail: "not exercised" };
  }

  return (
    <div className="heatmap">
      {CHANNELS.map((channel) => {
        const state = channelState(channel.id);
        return (
          <div key={channel.id} className={`heat-cell heat-${state.status}`}>
            <div className="heat-top">
              <span className="heat-label">{channel.label}</span>
              <StatusPill
                status={state.status === "leak" ? "fail" : state.status === "clean" ? "pass" : "untested"}
                label={state.status === "leak" ? "LEAK" : state.status === "clean" ? "CLEAN" : "UNTESTED"}
              />
            </div>
            <span className="heat-hint">{channel.hint}</span>
            <span className="heat-detail">{state.detail}</span>
          </div>
        );
      })}
      <div className={`heat-cell heat-wide ${scan?.clean === false ? "heat-leak" : scan ? "heat-clean" : "heat-untested"}`}>
        <div className="heat-top">
          <span className="heat-label">Scan verdict</span>
          <StatusPill
            status={scan?.clean === false ? "fail" : scan?.clean === true ? (notExercised.length > 0 ? "warn" : "pass") : "untested"}
            label={
              scan?.clean === false
                ? "LEAKS FOUND"
                : scan?.clean === true
                  ? notExercised.length > 0
                    ? "PARTIAL — NOT ALL CHANNELS"
                    : "CLEAN — SCANNED"
                  : "NO SCAN"
            }
          />
        </div>
        <span className="heat-detail">
          {scan
            ? `${leaks.length} leaks · ${scanned.length} channels scanned · ${notExercised.length} not exercised${mode === "naive" ? " · naive baseline" : ""}`
            : "Run a red-team case to produce a scan."}
        </span>
      </div>
    </div>
  );
}
