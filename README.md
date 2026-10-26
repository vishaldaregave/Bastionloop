# BastionLoop

**Proof, not paint.** An adversarial AI test arena where every finding ships with a signed **Proof-Carrying Finding (PCF)** that a third party can verify offline.

> Most platforms ask you to trust their dashboard. BastionLoop hands you a file you can verify, replay and tamper with. The dashboard is a viewer; the evidence is the product.

BastionLoop is the implementation of the **Bayora Problem 04** plan: Red, Blue and the model never connect directly; the gateway mediates every call; the ledger is a signed hash chain with Merkle checkpoints, a witness co-signature and an external anchor; every finding records commit-reveal payload secrecy, per-session model freshness, a six-channel canary scan, policy and image digests, and explicit non-claims.

---

## What it proves

- **Payload secrecy:** Red commits a hash of its payload before the run and reveals it after finalization. The PCF carries both; a mismatch invalidates the finding.
- **Model freshness:** each test gets its own model session. A canary planted in one session is probed from another; the result is in the PCF.
- **Isolation outcomes:** six canary channels (filesystem, environment, network, logs, model context, egress) are planted and scanned. Leaks are named by source and destination channel; raw canary values are never written to evidence.
- **Audit integrity:** every event chains to the previous hash; checkpoints are Merkle roots signed by the signer and cosigned by a separate witness; the checkpoint root is written to an external anchor.
- **Tamper detection:** edit one event, re-chain the ledger, delete, reorder or truncate the tail. The verifier names the first broken link; the anchor catches a re-chained truncation.
- **Honest coverage:** the Trust Report separates infrastructure failures from model-safety outcomes and lists what was **not** tested.

## What it does not prove

- The host kernel, container runtime and pinned keys are trusted.
- A kernel exploit, hardware side channel, or a compromised host admin before signing is out of scope.
- GPU memory leakage is not applicable to this CPU-only build.
- A pass means the tested control held on the tested path, not that the arena is secure.

These non-claims are attached to every PCF and printed in the Trust Report.

---

## Quickstart

### Local stack (tested path)

Requires Python 3.11+ and Node 20+.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -e ".[dev]"
npm --prefix apps/web install --include=dev

# Terminal 1: start the arena (Ctrl+C stops it)
python scripts/dev.py

# Terminal 2: dashboard
npm --prefix apps/web run dev
# open http://127.0.0.1:5173
```

Run the full demo and exit:

```bash
python scripts/dev.py --demo --once --clean
```

The demo creates hardened and naive runs, builds signed PCFs, verifies the ledger, tampers with a disposable copy, runs the challenge suite, and writes the Trust Report JSON/PDF.

### Container deployment

```bash
cp .env.example .env
docker compose up --build -d
# open http://localhost:8080
```

Only the web edge is published. The gateway and every tenant service are on internal Docker networks. The dashboard proxies `/v1` to the gateway.

Compose hardening is validated statically by `python scripts/check_compose.py`: internal tenant networks, read-only tenant containers, `cap_drop: ALL`, `no-new-privileges`, the seccomp deny-list, pids/memory/CPU limits, and no published service ports besides the web edge. This workstation has no Docker daemon, so the local stack is the exercised demo path; the Compose path is the deployment artifact.

Default demo credentials: admin token `dev-admin-token` (change it in `.env`).

---

## Five-minute demo

1. **Same attacks, opposite outcome.** Open **Isolation**, run both baselines. In naive mode the six-channel heatmap lights up and Session B retrieves Session A's canary. In BastionLoop mode the map is clean, the session is fresh, and the timing p-value is reported rather than asserted.
2. **Break the evidence.** Open **Audit**. Verify the chain, then hit “Edit + re-chain” or “Truncate + re-chain”. The verifier names the broken link or the anchor mismatch. The live ledger is untouched; tampering runs on an exported copy.
3. **Let a judge attack it.** Open **Judge challenge**, start a session, and run the issued command inside the Red container. Every attempt becomes a signed ledger event. End on **Findings**, open the PCF, download it, and verify it in the **Browser verifier** with the pinned keys. Then ask the judge to edit one field and verify again.

The exact script, commands and fallbacks are in [`docs/demo-script.md`](docs/demo-script.md).

---

## Architecture

```text
                 ┌──────────────────────────────┐
                 │  Web (React + Vite) :8080    │
                 └──────────────┬───────────────┘
                                │ /v1 proxy
                 ┌──────────────▼───────────────┐
                 │  Gateway :8000               │
                 │  capability tokens, policy,  │
                 │  padding, DLP, runs, SSE     │
                 └───┬─────────┬─────────┬──────┘
          evidence   │         │         │   tenant networks
        ┌────────────▼──┐  ┌───▼────┐  ┌─▼──────────────┐
        │ Notary :8001  │  │ Model  │  │ Blue :8006     │
        │ append-only   │  │ :8005  │  │ sealed verdicts│
        │ hash chain    │  └────────┘  └────────────────┘
        └───┬───────┬───┘
            │       │
     ┌──────▼──┐ ┌──▼─────────┐   ┌──────────────────┐
     │ Signer  │ │ Witness    │   │ Anchor :8004     │
     │ :8002   │ │ :8003      │   │ external JSONL   │
     └─────────┘ └────────────┘   └──────────────────┘
```

- **Notary** is the only writer of the ledger and holds no signing key.
- **Signer** holds the Ed25519 key and signs checkpoints and PCFs.
- **Witness** cosigns checkpoints and refuses rollback by counter.
- **Anchor** stores checkpoint roots outside the notary database.
- **Suite** runs the boundary tests and reports evidence IDs.
- **Red** is deliberately dumb and untrusted; it only gets a scoped token and a network route to the gateway.
- **Blue** returns verdicts, not rules; its HTTP surface is reachable only from the gateway network in Compose.

### Naive vs hardened

The naive mode is a deliberate demo baseline, not a fallback. It uses one shared model session, no verdict padding, visible Blue rules, and a permissive lab file API. Hardened mode uses per-session model calls, padded verdicts, sealed Blue and policy-enforced file access. Every run records which mode produced it.

### PCF anatomy

A PCF contains:

- `run` — benchmark, dataset digest, model, adapter, mode, runtime
- `attack` — case ID, category, prompt hash
- `payload` — commitment, reveal, reveal hash
- `model` — session ID, response hash, freshness proof and canary commitment
- `verdict` — decision and score (never Blue's rules)
- `policy` — bundle version and hash
- `images` — gateway/model/runtime digests
- `dlp` — egress scan result
- `canary_scan` — channels planted/scanned, leak channels, commitments only
- `chain` — ledger position, event hash, signed checkpoint
- `anchor` — external anchor entry
- `ledger` — the full event proof up to the checkpoint, with canonical bytes per event
- `trust` — scoped statement and explicit non-claims
- `signatures.signer` — Ed25519 signature, key ID, and the exact signed bytes (`payload_b64`)

The browser verifier uses the exact signed bytes, recomputes the hash chain, the Merkle root, both checkpoint signatures and the anchor chain with WebCrypto. It never trusts a server result.

---

## Challenge suite

| ID | Test | Current local result |
|---|---|---|
| IAM-01 | Tenant calls a privileged endpoint | PASS — HTTP 403 + evidence event |
| IAM-02 | Cross-tenant run / out-of-scope token | PASS — both denied |
| POL-01 | Tampered policy bundle | PASS — signature rejected |
| LLM-01 | Cross-session contamination | PASS — naive leaks, hardened clean |
| LLM-02 | Synthetic secret model-safety outcome | RECORDED — model outcome, not isolation |
| LLM-03 | Encoded canary egress DLP | PASS — plain/base64/hex/spaced/secret |
| AUD-01 | Edit one event | PASS — broken link named |
| AUD-02 | Delete or reorder an event | PASS — verifier fails both |
| AUD-03 | Truncate and re-chain | PASS — anchor/rollback detected |
| TIM-01 | Verdict timing distinguishability | PASS when enough samples; otherwise UNTESTED |
| MON-01 | Rebuild payload from monitor data | PASS — metadata only |
| REP-01 | Repeat a run with the same config | PASS when two comparable runs exist |
| ISO-01/02/03 | File/volume/container escape probes | UNTESTED locally; executed in Compose |
| NET-01/02/03 | Direct network, metadata, egress | UNTESTED locally; executed in Compose |
| RES-01 | Resource exhaustion | UNTESTED locally; cgroup limits are in Compose |

Every result is appended to the ledger with an evidence ID. The Trust Report never paints an untested item as passed.

---

## API (selected)

| Endpoint | Purpose |
|---|---|
| `POST /v1/tokens` | Admin issues a scoped capability token |
| `POST /v1/runs` / `POST /v1/runs/{id}/start` | Create/start an evaluation |
| `POST /v1/commit` / `POST /v1/reveal` | Payload commitment and reveal |
| `POST /v1/infer` | Authorized model request through the gateway |
| `POST /v1/policy/decide` | Policy decision with bundle hash |
| `POST /v1/ledger/append` / `GET /v1/ledger/verify` | Append and verify |
| `GET /v1/events` / `GET /v1/findings/{id}` | Sanitized events and PCF |
| `POST /v1/security-tests` | Run the challenge suite |
| `GET /v1/reports/trust.json` / `.pdf` / `.html` | Trust Report |
| `GET /v1/pinned-keys` | Public keys for the browser verifier |
| `POST /v1/verify/pcf` | Server-side PCF verification |
| `POST /v1/judge/session` | Create a judge run and scoped Red token |
| `GET /v1/dashboard/overview` / `/isolation` | Evidence-bound dashboard data |

## CLI

```bash
bastion keys init
bastion health
bastion verify finding.json --anchor http://anchor:8004
bastion verify ledger-export.json
bastion tamper --mode edit-rechain
bastion suite --report
bastion report
bastion export-pinned keys.json
bastion demo --suite --write-pcf
bastion serve --demo --once
```

`bastion verify` exits non-zero on a failed verification and names the first broken link.

---

## Tests

```bash
python -m pytest -q          # 31 unit tests: ledger, verifier, tokens, policy, DLP, timing, PCF, report
python scripts/dev.py --demo --once --clean   # end-to-end demo assertions
python scripts/check_compose.py               # Compose security invariants
npm --prefix apps/web run build               # TypeScript + production build
```

Manual browser-verifier test:

```bash
python scripts/dev.py --demo --once --clean
BASTION_DATA_DIR=var python -m bastion_cli.main export-pinned pinned.json
npm --prefix apps/web run build
# open the dashboard → Findings → select a PCF → Verify in browser
```

---

## Repository layout

```text
apps/web/                  React + Vite + Recharts evidence console
bastion_core/              canonical JSON, crypto, ledger, policy, DLP, PCF, verify, report
bastion_cli/               bastion CLI
services/gateway/          API, policy, runs, padding, DLP, dashboard, judge session
services/notary/           append-only ledger and checkpoints
services/signer/           Ed25519 checkpoint/PCF signing
services/witness/          checkpoint co-signature and rollback refusal
services/anchor/           external checkpoint anchor
services/challenge_suite/  boundary tests and Trust Report
workers/model/             per-session mock/Ollama adapter
workers/blue/              sealed verdict cell
workers/red/               probe server and judge challenge script
benchmarks/                synthetic safe stage subsets + raw AdvBench 520 / JailbreakBench 100
security/                  policy source (JSON/Rego) and seccomp deny-list
infra/                     Dockerfiles and Nginx
docs/                      architecture, threat model, runbook, residual risks, demo script
tests/                     unit regression suite
compose.yaml               hardened topology
```

## Attribution

The real AdvBench 520 and JailbreakBench 100 corpora were copied from the **Centinela/Bayora** codebase for benchmark credibility. The UI direction, model-adapter idea and echo/semantic filtering were informed by that project; the evidence plane, PCF format, browser verifier, checkpoints, witness, anchor, challenge suite and Trust Report are new here. The stage demo uses the synthetic `benchmarks/*-subset.v1.json` files so no harmful prompts are displayed.

## License

MIT for this implementation. See [`LICENSE`](LICENSE).
