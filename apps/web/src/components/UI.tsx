import React, { useState } from "react";

export type Status =
  | "verified"
  | "failed"
  | "pass"
  | "fail"
  | "untested"
  | "recorded"
  | "running"
  | "complete"
  | "created"
  | "starting"
  | "blocked"
  | "allow"
  | "naive"
  | "hardened"
  | "warn";

const LABELS: Record<Status, string> = {
  verified: "VERIFIED",
  failed: "FAILED",
  pass: "PASS",
  fail: "FAIL",
  untested: "UNTESTED",
  recorded: "RECORDED",
  running: "RUNNING",
  complete: "COMPLETE",
  created: "CREATED",
  starting: "STARTING",
  blocked: "BLOCKED",
  allow: "ALLOW",
  naive: "NAIVE",
  hardened: "HARDENED",
  warn: "WARN",
};

export function StatusPill({ status, label }: { status: Status | string; label?: string }) {
  const key = (LABELS[status as Status] ? status : "untested") as Status;
  return <span className={`pill pill-${key}`}>{label ?? LABELS[key]}</span>;
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  tone,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "danger" | "success" | "warn";
}) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ""} ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function EvidenceValue({
  value,
  evidenceId,
  status = "verified",
  detail,
}: {
  value: React.ReactNode;
  evidenceId?: string | null;
  status?: "verified" | "unverified" | "untested";
  detail?: string;
}) {
  if (status === "untested") {
    return (
      <span className="evidence-value untested" title={detail ?? "No executed test backs this value"}>
        UNTESTED
      </span>
    );
  }
  if (status === "unverified") {
    return (
      <span className="evidence-value unverified" title={detail ?? "The verifier did not confirm this value"}>
        UNVERIFIED
      </span>
    );
  }
  return (
    <span className="evidence-value">
      {value}
      {evidenceId ? <span className="evidence-id">{evidenceId}</span> : <span className="evidence-id warn">no-evidence</span>}
    </span>
  );
}

export function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className={`field-value ${mono ? "mono" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ value, maxHeight = 260 }: { value: unknown; maxHeight?: number }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="code-wrap">
      <button className="btn btn-ghost btn-xs code-copy" onClick={() => navigator.clipboard.writeText(text)}>
        copy
      </button>
      <pre className="code" style={{ maxHeight }}>
        {text}
      </pre>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner">
      <span>
        <b>Gateway error.</b> {message}
      </span>
      {onRetry && (
        <button className="btn btn-ghost btn-xs" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="spinner">
      <i /> {label}
    </span>
  );
}

export function ModeSwitch({
  mode,
  onChange,
  busy,
  allowNaive = true,
}: {
  mode: string;
  onChange: (mode: "hardened" | "naive") => void;
  busy?: boolean;
  allowNaive?: boolean;
}) {
  return (
    <div className="mode-switch" role="group" aria-label="Isolation mode">
      <button
        className={`mode-button ${mode === "hardened" ? "active" : ""}`}
        onClick={() => onChange("hardened")}
        disabled={busy}
      >
        <span className="dot dot-green" />
        BastionLoop
      </button>
      <button
        className={`mode-button danger ${mode === "naive" ? "active" : ""}`}
        onClick={() => onChange("naive")}
        disabled={busy || !allowNaive}
        title={allowNaive ? "Deliberate unsafe baseline for comparison" : "Naive mode is disabled"}
      >
        <span className="dot dot-red" />
        Naive
      </button>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="section-title">
      <h1>{children}</h1>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function InlineStat({
  label,
  value,
  evidenceId,
  status,
}: {
  label: string;
  value: React.ReactNode;
  evidenceId?: string | null;
  status?: "verified" | "unverified" | "untested";
}) {
  return (
    <div className="inline-stat">
      <span className="inline-label">{label}</span>
      <EvidenceValue value={value} evidenceId={evidenceId} status={status} />
    </div>
  );
}
