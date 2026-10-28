import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

HTML_DARK = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #0b0e14;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #f1f5f9;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
  }
  .card {
    background: #11151f;
    border: 1px solid #242a38;
    border-radius: 12px;
    padding: 26px 30px;
    width: 1200px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 22px;
    border-bottom: 1px solid #202736;
    padding-bottom: 16px;
  }
  .title-area h1 {
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }
  .subtitle {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 5px;
  }
  .meta-tags {
    display: flex;
    gap: 10px;
    font-size: 11px;
    color: #64748b;
  }
  .meta-tag {
    background: #161b26;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #262f40;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .legend {
    display: flex;
    justify-content: center;
    gap: 26px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #202736;
    font-size: 12px;
    color: #94a3b8;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="title-area">
      <h1>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        BastionLoop UML Use Case Architecture
        <span class="badge">Production V1.0</span>
      </h1>
      <p class="subtitle">Complete Behavioral Actor Boundaries, Security Subsystems & Trust Core Attestation Pipeline</p>
    </div>
    <div class="meta-tags">
      <span class="meta-tag">IEEE 1471 Standard</span>
      <span class="meta-tag">Ed25519 / Merkle Proof</span>
      <span class="meta-tag">HackInTheHills '26</span>
    </div>
  </div>

  <svg viewBox="0 0 920 540" id="useCaseSvg">
    <defs>
      <marker id="arrow-inc" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 6 5 L 0 8 z" fill="#64748b" />
      </marker>
    </defs>

    <!-- SYSTEM BOUNDARY -->
    <rect x="200" y="16" width="520" height="508" rx="10" fill="#0c1017" stroke="#2d3648" stroke-width="1.8" />
    <text x="220" y="38" fill="#64748b" font-size="11.5" font-weight="700" letter-spacing="1">SYSTEM BOUNDARY: BASTIONLOOP ZERO-TRUST ARENA</text>

    <!-- 4 SUBSYSTEM ZONES -->
    <!-- Red Subsystem -->
    <rect x="215" y="48" width="490" height="106" rx="8" fill="#1b1318" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6" />
    <text x="228" y="67" fill="#f43f5e" font-size="10.5" font-weight="700" letter-spacing="0.5">RED OPS (OFFENSIVE EVALUATION ARENA)</text>

    <!-- Blue Subsystem -->
    <rect x="215" y="164" width="490" height="106" rx="8" fill="#10192a" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6" />
    <text x="228" y="183" fill="#38bdf8" font-size="10.5" font-weight="700" letter-spacing="0.5">BLUE OPS (ACTIVE GUARDRAIL ENGINE)</text>

    <!-- Model Ops Subsystem -->
    <rect x="215" y="280" width="490" height="106" rx="8" fill="#0d211b" stroke="#10b981" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6" />
    <text x="228" y="299" fill="#10b981" font-size="10.5" font-weight="700" letter-spacing="0.5">MODEL OPS (SESSION ISOLATION & DLP)</text>

    <!-- Trust Core Subsystem -->
    <rect x="215" y="396" width="490" height="118" rx="8" fill="#221b0e" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6" />
    <text x="228" y="415" fill="#fbbf24" font-size="10.5" font-weight="700" letter-spacing="0.5">TRUST CORE (IMMUTABLE EVIDENCE & PCF ATTESTATION)</text>

    <!-- ACTORS -->
    <g class="actor-box">
      <circle cx="95" cy="74" r="14" fill="#1e2433" stroke="#f43f5e" stroke-width="2.2" />
      <line x1="95" y1="88" x2="95" y2="114" stroke="#f43f5e" stroke-width="2.2" />
      <line x1="75" y1="99" x2="115" y2="99" stroke="#f43f5e" stroke-width="2.2" />
      <line x1="95" y1="114" x2="80" y2="134" stroke="#f43f5e" stroke-width="2.2" />
      <line x1="95" y1="114" x2="110" y2="134" stroke="#f43f5e" stroke-width="2.2" />
      <text x="95" y="152" fill="#fda4af" font-size="12" font-weight="700" text-anchor="middle">Red Team</text>
      <text x="95" y="165" fill="#94a3b8" font-size="9.5" text-anchor="middle">Offensive Engineer</text>
    </g>

    <g class="actor-box">
      <circle cx="95" cy="190" r="14" fill="#1e2433" stroke="#38bdf8" stroke-width="2.2" />
      <line x1="95" y1="204" x2="95" y2="230" stroke="#38bdf8" stroke-width="2.2" />
      <line x1="75" y1="215" x2="115" y2="215" stroke="#38bdf8" stroke-width="2.2" />
      <line x1="95" y1="230" x2="80" y2="250" stroke="#38bdf8" stroke-width="2.2" />
      <line x1="95" y1="230" x2="110" y2="250" stroke="#38bdf8" stroke-width="2.2" />
      <text x="95" y="268" fill="#bae6fd" font-size="12" font-weight="700" text-anchor="middle">Blue Team</text>
      <text x="95" y="281" fill="#94a3b8" font-size="9.5" text-anchor="middle">Guardrail Engineer</text>
    </g>

    <g class="actor-box">
      <circle cx="95" cy="306" r="14" fill="#1e2433" stroke="#10b981" stroke-width="2.2" />
      <line x1="95" y1="320" x2="95" y2="346" stroke="#10b981" stroke-width="2.2" />
      <line x1="75" y1="331" x2="115" y2="331" stroke="#10b981" stroke-width="2.2" />
      <line x1="95" y1="346" x2="80" y2="366" stroke="#10b981" stroke-width="2.2" />
      <line x1="95" y1="346" x2="110" y2="366" stroke="#10b981" stroke-width="2.2" />
      <text x="95" y="384" fill="#a7f3d0" font-size="12" font-weight="700" text-anchor="middle">Model Ops</text>
      <text x="95" y="397" fill="#94a3b8" font-size="9.5" text-anchor="middle">ML Platform Eng</text>
    </g>

    <g class="actor-box">
      <rect x="760" y="88" width="115" height="52" rx="8" fill="#1b152d" stroke="#c084fc" stroke-width="1.8" />
      <text x="817" y="110" fill="#d8b4fe" font-size="10.5" font-weight="700" text-anchor="middle">&lt;&lt;System&gt;&gt;</text>
      <text x="817" y="127" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">Target LLM</text>
      <text x="817" y="152" fill="#94a3b8" font-size="9.5" text-anchor="middle">Local/Cloud Host</text>
    </g>

    <g class="actor-box">
      <rect x="760" y="255" width="115" height="52" rx="8" fill="#241b10" stroke="#f59e0b" stroke-width="1.8" />
      <text x="817" y="277" fill="#fde68a" font-size="10.5" font-weight="700" text-anchor="middle">&lt;&lt;Service&gt;&gt;</text>
      <text x="817" y="294" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">Notary & Witness</text>
      <text x="817" y="319" fill="#94a3b8" font-size="9.5" text-anchor="middle">Ed25519 Cosigner</text>
    </g>

    <g class="actor-box">
      <circle cx="817" cy="425" r="14" fill="#1e2433" stroke="#fbbf24" stroke-width="2.2" />
      <line x1="817" y1="439" x2="817" y2="465" stroke="#fbbf24" stroke-width="2.2" />
      <line x1="797" y1="450" x2="837" y2="450" stroke="#fbbf24" stroke-width="2.2" />
      <line x1="817" y1="465" x2="802" y2="485" stroke="#fbbf24" stroke-width="2.2" />
      <line x1="817" y1="465" x2="832" y2="485" stroke="#fbbf24" stroke-width="2.2" />
      <text x="817" y="503" fill="#fde68a" font-size="12" font-weight="700" text-anchor="middle">Auditor / CISO</text>
      <text x="817" y="516" fill="#94a3b8" font-size="9.5" text-anchor="middle">Third-Party Verifier</text>
    </g>

    <!-- USE CASES -->
    <g>
      <rect x="235" y="80" width="200" height="34" rx="17" fill="#27151a" stroke="#f43f5e" stroke-width="1.4" />
      <text x="335" y="102" fill="#fda4af" font-size="11" font-weight="600" text-anchor="middle">Commit-Reveal Payload</text>
    </g>
    <g>
      <rect x="480" y="80" width="205" height="34" rx="17" fill="#27151a" stroke="#f43f5e" stroke-width="1.4" />
      <text x="582" y="102" fill="#fda4af" font-size="11" font-weight="600" text-anchor="middle">Execute Adversarial Probes</text>
    </g>
    <g>
      <rect x="355" y="120" width="205" height="28" rx="14" fill="#1e1014" stroke="#fb7185" stroke-width="1" />
      <text x="457" y="138" fill="#fecdd3" font-size="10" text-anchor="middle">Run Regression Benchmarks</text>
    </g>

    <g>
      <rect x="235" y="196" width="200" height="34" rx="17" fill="#122036" stroke="#38bdf8" stroke-width="1.4" />
      <text x="335" y="218" fill="#bae6fd" font-size="11" font-weight="600" text-anchor="middle">Configure Safety Policies</text>
    </g>
    <g>
      <rect x="480" y="196" width="205" height="34" rx="17" fill="#122036" stroke="#38bdf8" stroke-width="1.4" />
      <text x="582" y="218" fill="#bae6fd" font-size="11" font-weight="600" text-anchor="middle">Intercept & Block Exploits</text>
    </g>
    <g>
      <rect x="355" y="236" width="205" height="28" rx="14" fill="#0d1828" stroke="#7dd3fc" stroke-width="1" />
      <text x="457" y="254" fill="#e0f2fe" font-size="10" text-anchor="middle">Audit Evasion Forensics</text>
    </g>

    <g>
      <rect x="235" y="312" width="200" height="34" rx="17" fill="#112921" stroke="#10b981" stroke-width="1.4" />
      <text x="335" y="334" fill="#a7f3d0" font-size="11" font-weight="600" text-anchor="middle">Spawn Ephemeral Sessions</text>
    </g>
    <g>
      <rect x="480" y="312" width="205" height="34" rx="17" fill="#112921" stroke="#10b981" stroke-width="1.4" />
      <text x="582" y="334" fill="#a7f3d0" font-size="11" font-weight="600" text-anchor="middle">Scan 6-Channel Canaries</text>
    </g>
    <g>
      <rect x="355" y="352" width="205" height="28" rx="14" fill="#0a1d17" stroke="#34d399" stroke-width="1" />
      <text x="457" y="370" fill="#d1fae5" font-size="10" text-anchor="middle">Verify Context Decontamination</text>
    </g>

    <g>
      <rect x="235" y="428" width="200" height="34" rx="17" fill="#2d2211" stroke="#fbbf24" stroke-width="1.4" />
      <text x="335" y="450" fill="#fde68a" font-size="11" font-weight="600" text-anchor="middle">Export Proof Findings (PCFs)</text>
    </g>
    <g>
      <rect x="480" y="428" width="205" height="34" rx="17" fill="#2d2211" stroke="#fbbf24" stroke-width="1.4" />
      <text x="582" y="450" fill="#fde68a" font-size="11" font-weight="600" text-anchor="middle">Verify Ed25519 & Merkle Trees</text>
    </g>
    <g>
      <rect x="355" y="472" width="205" height="30" rx="15" fill="#231908" stroke="#f59e0b" stroke-width="1.1" />
      <text x="457" y="491" fill="#fef3c7" font-size="10" text-anchor="middle">Attest Public Anchor & Anti-Rollback</text>
    </g>

    <!-- CONNECTORS -->
    <line x1="120" y1="97" x2="235" y2="97" stroke="#f43f5e" stroke-width="1.8" opacity="0.9" />
    <line x1="120" y1="97" x2="480" y2="97" stroke="#f43f5e" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />
    <line x1="120" y1="108" x2="355" y2="134" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.5" />

    <line x1="120" y1="213" x2="235" y2="213" stroke="#38bdf8" stroke-width="1.8" opacity="0.9" />
    <line x1="120" y1="213" x2="480" y2="213" stroke="#38bdf8" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />
    <line x1="120" y1="224" x2="355" y2="250" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.5" />

    <line x1="120" y1="329" x2="235" y2="329" stroke="#10b981" stroke-width="1.8" opacity="0.9" />
    <line x1="120" y1="329" x2="480" y2="329" stroke="#10b981" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />
    <line x1="120" y1="340" x2="355" y2="366" stroke="#10b981" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.5" />

    <line x1="760" y1="114" x2="685" y2="97" stroke="#c084fc" stroke-width="1.5" opacity="0.85" />
    <line x1="760" y1="124" x2="435" y2="320" stroke="#c084fc" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.5" />

    <line x1="760" y1="281" x2="435" y2="440" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />
    <line x1="760" y1="291" x2="560" y2="487" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />

    <line x1="790" y1="445" x2="685" y2="445" stroke="#fbbf24" stroke-width="1.8" opacity="0.9" />
    <line x1="790" y1="455" x2="560" y2="487" stroke="#fbbf24" stroke-width="1.8" opacity="0.9" />
    <line x1="790" y1="445" x2="435" y2="445" stroke="#fbbf24" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.55" />

    <path d="M 582 114 L 582 196" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc)" />
    <text x="590" y="157" fill="#94a3b8" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>

    <path d="M 582 230 L 582 312" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc)" />
    <text x="590" y="273" fill="#94a3b8" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>

    <path d="M 335 346 L 335 428" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc)" />
    <text x="278" y="389" fill="#94a3b8" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>
  </svg>

  <div class="legend">
    <div class="legend-item"><span class="legend-dot" style="background:#f43f5e"></span> Offensive Red Operations</div>
    <div class="legend-item"><span class="legend-dot" style="background:#38bdf8"></span> Defensive Guardrail Rules</div>
    <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span> Session Isolation & DLP</div>
    <div class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span> Cryptographic Proofs & Attestation</div>
    <div class="legend-item"><span class="legend-dot" style="background:#64748b"></span> <code>&lt;&lt;include&gt;&gt;</code> Platform Pipeline</div>
  </div>
</div>
</body>
</html>
"""

HTML_LIGHT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
  }
  .card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 26px 30px;
    width: 1200px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.06);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 22px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 16px;
  }
  .title-area h1 {
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 20px;
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
  }
  .subtitle {
    font-size: 13px;
    color: #64748b;
    margin-top: 5px;
  }
  .meta-tags {
    display: flex;
    gap: 10px;
    font-size: 11px;
    color: #475569;
  }
  .meta-tag {
    background: #f1f5f9;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .legend {
    display: flex;
    justify-content: center;
    gap: 26px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #475569;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="title-area">
      <h1>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        BastionLoop UML Use Case Architecture
        <span class="badge">Production V1.0</span>
      </h1>
      <p class="subtitle">Complete Behavioral Actor Boundaries, Security Subsystems & Trust Core Attestation Pipeline</p>
    </div>
    <div class="meta-tags">
      <span class="meta-tag">IEEE 1471 Standard</span>
      <span class="meta-tag">Ed25519 / Merkle Proof</span>
      <span class="meta-tag">HackInTheHills '26</span>
    </div>
  </div>

  <svg viewBox="0 0 920 540" id="useCaseSvg">
    <defs>
      <marker id="arrow-inc-light" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 6 5 L 0 8 z" fill="#64748b" />
      </marker>
    </defs>

    <!-- SYSTEM BOUNDARY -->
    <rect x="200" y="16" width="520" height="508" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.8" />
    <text x="220" y="38" fill="#475569" font-size="11.5" font-weight="700" letter-spacing="1">SYSTEM BOUNDARY: BASTIONLOOP ZERO-TRUST ARENA</text>

    <!-- 4 SUBSYSTEM ZONES -->
    <rect x="215" y="48" width="490" height="106" rx="8" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="4 4" />
    <text x="228" y="67" fill="#be123c" font-size="10.5" font-weight="700" letter-spacing="0.5">RED OPS (OFFENSIVE EVALUATION ARENA)</text>

    <rect x="215" y="164" width="490" height="106" rx="8" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="1.2" stroke-dasharray="4 4" />
    <text x="228" y="183" fill="#0369a1" font-size="10.5" font-weight="700" letter-spacing="0.5">BLUE OPS (ACTIVE GUARDRAIL ENGINE)</text>

    <rect x="215" y="280" width="490" height="106" rx="8" fill="#f0fdf4" stroke="#10b981" stroke-width="1.2" stroke-dasharray="4 4" />
    <text x="228" y="299" fill="#047857" font-size="10.5" font-weight="700" letter-spacing="0.5">MODEL OPS (SESSION ISOLATION & DLP)</text>

    <rect x="215" y="396" width="490" height="118" rx="8" fill="#fefce8" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4 4" />
    <text x="228" y="415" fill="#b45309" font-size="10.5" font-weight="700" letter-spacing="0.5">TRUST CORE (IMMUTABLE EVIDENCE & PCF ATTESTATION)</text>

    <!-- ACTORS -->
    <g class="actor-box">
      <circle cx="95" cy="74" r="14" fill="#ffffff" stroke="#e11d48" stroke-width="2.2" />
      <line x1="95" y1="88" x2="95" y2="114" stroke="#e11d48" stroke-width="2.2" />
      <line x1="75" y1="99" x2="115" y2="99" stroke="#e11d48" stroke-width="2.2" />
      <line x1="95" y1="114" x2="80" y2="134" stroke="#e11d48" stroke-width="2.2" />
      <line x1="95" y1="114" x2="110" y2="134" stroke="#e11d48" stroke-width="2.2" />
      <text x="95" y="152" fill="#be123c" font-size="12" font-weight="700" text-anchor="middle">Red Team</text>
      <text x="95" y="165" fill="#64748b" font-size="9.5" text-anchor="middle">Offensive Engineer</text>
    </g>

    <g class="actor-box">
      <circle cx="95" cy="190" r="14" fill="#ffffff" stroke="#0284c7" stroke-width="2.2" />
      <line x1="95" y1="204" x2="95" y2="230" stroke="#0284c7" stroke-width="2.2" />
      <line x1="75" y1="215" x2="115" y2="215" stroke="#0284c7" stroke-width="2.2" />
      <line x1="95" y1="230" x2="80" y2="250" stroke="#0284c7" stroke-width="2.2" />
      <line x1="95" y1="230" x2="110" y2="250" stroke="#0284c7" stroke-width="2.2" />
      <text x="95" y="268" fill="#0369a1" font-size="12" font-weight="700" text-anchor="middle">Blue Team</text>
      <text x="95" y="281" fill="#64748b" font-size="9.5" text-anchor="middle">Guardrail Engineer</text>
    </g>

    <g class="actor-box">
      <circle cx="95" cy="306" r="14" fill="#ffffff" stroke="#059669" stroke-width="2.2" />
      <line x1="95" y1="320" x2="95" y2="346" stroke="#059669" stroke-width="2.2" />
      <line x1="75" y1="331" x2="115" y2="331" stroke="#059669" stroke-width="2.2" />
      <line x1="95" y1="346" x2="80" y2="366" stroke="#059669" stroke-width="2.2" />
      <line x1="95" y1="346" x2="110" y2="366" stroke="#059669" stroke-width="2.2" />
      <text x="95" y="384" fill="#047857" font-size="12" font-weight="700" text-anchor="middle">Model Ops</text>
      <text x="95" y="397" fill="#64748b" font-size="9.5" text-anchor="middle">ML Platform Eng</text>
    </g>

    <g class="actor-box">
      <rect x="760" y="88" width="115" height="52" rx="8" fill="#fdf4ff" stroke="#9333ea" stroke-width="1.8" />
      <text x="817" y="110" fill="#7e22ce" font-size="10.5" font-weight="700" text-anchor="middle">&lt;&lt;System&gt;&gt;</text>
      <text x="817" y="127" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">Target LLM</text>
      <text x="817" y="152" fill="#64748b" font-size="9.5" text-anchor="middle">Local/Cloud Host</text>
    </g>

    <g class="actor-box">
      <rect x="760" y="255" width="115" height="52" rx="8" fill="#fffbeb" stroke="#d97706" stroke-width="1.8" />
      <text x="817" y="277" fill="#b45309" font-size="10.5" font-weight="700" text-anchor="middle">&lt;&lt;Service&gt;&gt;</text>
      <text x="817" y="294" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">Notary & Witness</text>
      <text x="817" y="319" fill="#64748b" font-size="9.5" text-anchor="middle">Ed25519 Cosigner</text>
    </g>

    <g class="actor-box">
      <circle cx="817" cy="425" r="14" fill="#ffffff" stroke="#d97706" stroke-width="2.2" />
      <line x1="817" y1="439" x2="817" y2="465" stroke="#d97706" stroke-width="2.2" />
      <line x1="797" y1="450" x2="837" y2="450" stroke="#d97706" stroke-width="2.2" />
      <line x1="817" y1="465" x2="802" y2="485" stroke="#d97706" stroke-width="2.2" />
      <line x1="817" y1="465" x2="832" y2="485" stroke="#d97706" stroke-width="2.2" />
      <text x="817" y="503" fill="#b45309" font-size="12" font-weight="700" text-anchor="middle">Auditor / CISO</text>
      <text x="817" y="516" fill="#64748b" font-size="9.5" text-anchor="middle">Third-Party Verifier</text>
    </g>

    <!-- USE CASES -->
    <g>
      <rect x="235" y="80" width="200" height="34" rx="17" fill="#ffffff" stroke="#e11d48" stroke-width="1.5" />
      <text x="335" y="102" fill="#be123c" font-size="11" font-weight="600" text-anchor="middle">Commit-Reveal Payload</text>
    </g>
    <g>
      <rect x="480" y="80" width="205" height="34" rx="17" fill="#ffffff" stroke="#e11d48" stroke-width="1.5" />
      <text x="582" y="102" fill="#be123c" font-size="11" font-weight="600" text-anchor="middle">Execute Adversarial Probes</text>
    </g>
    <g>
      <rect x="355" y="120" width="205" height="28" rx="14" fill="#fff1f2" stroke="#f43f5e" stroke-width="1" />
      <text x="457" y="138" fill="#e11d48" font-size="10" text-anchor="middle">Run Regression Benchmarks</text>
    </g>

    <g>
      <rect x="235" y="196" width="200" height="34" rx="17" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
      <text x="335" y="218" fill="#0369a1" font-size="11" font-weight="600" text-anchor="middle">Configure Safety Policies</text>
    </g>
    <g>
      <rect x="480" y="196" width="205" height="34" rx="17" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
      <text x="582" y="218" fill="#0369a1" font-size="11" font-weight="600" text-anchor="middle">Intercept & Block Exploits</text>
    </g>
    <g>
      <rect x="355" y="236" width="205" height="28" rx="14" fill="#f0f9ff" stroke="#38bdf8" stroke-width="1" />
      <text x="457" y="254" fill="#0284c7" font-size="10" text-anchor="middle">Audit Evasion Forensics</text>
    </g>

    <g>
      <rect x="235" y="312" width="200" height="34" rx="17" fill="#ffffff" stroke="#059669" stroke-width="1.5" />
      <text x="335" y="334" fill="#047857" font-size="11" font-weight="600" text-anchor="middle">Spawn Ephemeral Sessions</text>
    </g>
    <g>
      <rect x="480" y="312" width="205" height="34" rx="17" fill="#ffffff" stroke="#059669" stroke-width="1.5" />
      <text x="582" y="334" fill="#047857" font-size="11" font-weight="600" text-anchor="middle">Scan 6-Channel Canaries</text>
    </g>
    <g>
      <rect x="355" y="352" width="205" height="28" rx="14" fill="#f0fdf4" stroke="#34d399" stroke-width="1" />
      <text x="457" y="370" fill="#059669" font-size="10" text-anchor="middle">Verify Context Decontamination</text>
    </g>

    <g>
      <rect x="235" y="428" width="200" height="34" rx="17" fill="#ffffff" stroke="#d97706" stroke-width="1.5" />
      <text x="335" y="450" fill="#b45309" font-size="11" font-weight="600" text-anchor="middle">Export Proof Findings (PCFs)</text>
    </g>
    <g>
      <rect x="480" y="428" width="205" height="34" rx="17" fill="#ffffff" stroke="#d97706" stroke-width="1.5" />
      <text x="582" y="450" fill="#b45309" font-size="11" font-weight="600" text-anchor="middle">Verify Ed25519 & Merkle Trees</text>
    </g>
    <g>
      <rect x="355" y="472" width="205" height="30" rx="15" fill="#fefce8" stroke="#f59e0b" stroke-width="1.1" />
      <text x="457" y="491" fill="#b45309" font-size="10" text-anchor="middle">Attest Public Anchor & Anti-Rollback</text>
    </g>

    <!-- CONNECTORS -->
    <line x1="120" y1="97" x2="235" y2="97" stroke="#e11d48" stroke-width="1.8" />
    <line x1="120" y1="97" x2="480" y2="97" stroke="#e11d48" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.75" />
    <line x1="120" y1="108" x2="355" y2="134" stroke="#e11d48" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.6" />

    <line x1="120" y1="213" x2="235" y2="213" stroke="#0284c7" stroke-width="1.8" />
    <line x1="120" y1="213" x2="480" y2="213" stroke="#0284c7" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.75" />
    <line x1="120" y1="224" x2="355" y2="250" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.6" />

    <line x1="120" y1="329" x2="235" y2="329" stroke="#059669" stroke-width="1.8" />
    <line x1="120" y1="329" x2="480" y2="329" stroke="#059669" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.75" />
    <line x1="120" y1="340" x2="355" y2="366" stroke="#059669" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.6" />

    <line x1="760" y1="114" x2="685" y2="97" stroke="#7e22ce" stroke-width="1.5" />
    <line x1="760" y1="124" x2="435" y2="320" stroke="#7e22ce" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6" />

    <line x1="760" y1="281" x2="435" y2="440" stroke="#d97706" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.75" />
    <line x1="760" y1="291" x2="560" y2="487" stroke="#d97706" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.75" />

    <line x1="790" y1="445" x2="685" y2="445" stroke="#d97706" stroke-width="1.8" />
    <line x1="790" y1="455" x2="560" y2="487" stroke="#d97706" stroke-width="1.8" />
    <line x1="790" y1="445" x2="435" y2="445" stroke="#d97706" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.65" />

    <path d="M 582 114 L 582 196" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc-light)" />
    <text x="590" y="157" fill="#64748b" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>

    <path d="M 582 230 L 582 312" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc-light)" />
    <text x="590" y="273" fill="#64748b" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>

    <path d="M 335 346 L 335 428" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arrow-inc-light)" />
    <text x="278" y="389" fill="#64748b" font-size="9" font-style="italic">&lt;&lt;include&gt;&gt;</text>
  </svg>

  <div class="legend">
    <div class="legend-item"><span class="legend-dot" style="background:#e11d48"></span> Offensive Red Operations</div>
    <div class="legend-item"><span class="legend-dot" style="background:#0284c7"></span> Defensive Guardrail Rules</div>
    <div class="legend-item"><span class="legend-dot" style="background:#059669"></span> Session Isolation & DLP</div>
    <div class="legend-item"><span class="legend-dot" style="background:#d97706"></span> Cryptographic Proofs & Attestation</div>
    <div class="legend-item"><span class="legend-dot" style="background:#64748b"></span> <code>&lt;&lt;include&gt;&gt;</code> Platform Pipeline</div>
  </div>
</div>
</body>
</html>
"""

def render_html_to_png(html_text: str, out_filename: str):
    temp_html = ROOT / f"temp_{out_filename}.html"
    temp_html.write_text(html_text, encoding="utf-8")
    
    edge_bin = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    out_repo = ROOT / "docs" / out_filename
    out_downloads = Path(r"C:\Users\vishal\Downloads") / out_filename
    
    cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        f"--screenshot={str(out_repo)}",
        "--window-size=1300,820",
        "--force-device-scale-factor=2",
        "--hide-scrollbars",
        str(temp_html.as_uri())
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        shutil.copy2(out_repo, out_downloads)
        print(f"Generated: {out_repo.name} -> Saved to docs/ & Downloads/")
    else:
        print(f"Failed to generate {out_filename}:", res.stderr)
    temp_html.unlink(missing_ok=True)

def main():
    print("Rendering high-res PNG diagrams...")
    render_html_to_png(HTML_DARK, "bastionloop_use_case_diagram.png")
    render_html_to_png(HTML_LIGHT, "bastionloop_use_case_diagram_light.png")

if __name__ == "__main__":
    main()
