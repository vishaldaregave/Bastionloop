import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "overview"
  | "runs"
  | "findings"
  | "evidence"
  | "verification"
  | "settings"
  | "search"
  | "panel"
  | "sun"
  | "moon"
  | "command"
  | "chevron-down"
  | "chevron-right"
  | "plus"
  | "check"
  | "x"
  | "alert"
  | "play"
  | "shield"
  | "database"
  | "flag"
  | "activity"
  | "external"
  | "refresh"
  | "key"
  | "lock"
  | "arrow-right";

const PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  runs: (
    <>
      <path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11-7.2a1 1 0 0 0 0-1.8l-11-7.2A1 1 0 0 0 7 4.8Z" />
      <path d="M4 5v14" />
    </>
  ),
  findings: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.2 4L17 12H5" />
      <path d="M8 12v9" />
    </>
  ),
  evidence: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  verification: (
    <>
      <path d="M12 3 5 6v5c0 4.4 2.8 8.2 7 10 4.2-1.8 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />,
  command: (
    <>
      <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
    </>
  ),
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m4 12 5 5L20 6" />,
  x: <path d="m5 5 14 14M19 5 5 19" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17.5v.1" />
    </>
  ),
  play: <path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11-7.2a1 1 0 0 0 0-1.8l-11-7.2A1 1 0 0 0 7 4.8Z" />,
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.4 2.8 8.2 7 10 4.2-1.8 7-5.6 7-10V6l-7-3Z" />
      <path d="M9 12h6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.2 4L17 12H5" />
    </>
  ),
  activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2 5.3" />
      <path d="M20 4v7h-7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l2 2M14 9l2 2" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.6,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
