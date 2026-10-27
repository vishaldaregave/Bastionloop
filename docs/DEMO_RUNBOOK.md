# BastionLoop demo runbook

This runbook is for a disposable local demonstration. It is not a production deployment guide.

## Prerequisites

- Python 3.11+ (`3.14.3` was used for this review)
- Node.js 20+ (`v24.15.0` was used)
- Free local ports: `8000`-`8007` and `8010`
- Python dependencies installed:

```bash
python -m pip install -e ".[dev]"
```

- Frontend dependencies installed only if serving the UI:

```bash
npm --prefix apps/web install --include=dev
```

- Docker is optional. It is **not installed** on the review machine. Without Docker:
  - the local HTTP stack works;
  - container namespace, volume, network and cgroup tests are `UNTESTED`;
  - do not describe them as passed.
- The default adapter is `BASTION_MODEL_ADAPTER=mock`. Results are deterministic mock-model results, not real-model evidence.

## 1. Start a clean local stack

Use a disposable data directory. `--clean` deletes `var/`; never use it against data you need.

```bash
python scripts/dev.py --no-block --clean
```

Expected service endpoints:

```text
gateway  http://127.0.0.1:8000
notary   http://127.0.0.1:8001
signer   http://127.0.0.1:8002
witness  http://127.0.0.1:8003
anchor   http://127.0.0.1:8004
model    http://127.0.0.1:8005
blue     http://127.0.0.1:8006
suite    http://127.0.0.1:8007
red      http://127.0.0.1:8010
```

Start the UI in a second terminal:

```bash
npm --prefix apps/web run dev
```

Open `http://127.0.0.1:5173`.

## 2. Hardened demonstration

```bash
python -m bastion_cli.main demo --mode hardened --benchmark jailbreakbench-subset.v1 --cases 6 --suite --write-pcf
```

Expected observed behavior on the mock model:

- run status `complete`;
- six block decisions;
- four findings;
- freshness `clean`;
- canary scan clean for the exercised channels;
- four PCFs `VERIFIED`;
- ledger `VERIFIED`;
- tamper simulator before `VERIFIED`, after `FAILED`.

The local demo is a tested-path claim only. It does not prove container isolation.

## 3. Naive demonstration

```bash
python -m bastion_cli.main demo --mode naive --benchmark jailbreakbench-subset.v1 --cases 6 --write-pcf
```

Expected observed behavior on the mock model:

- run status `complete`;
- six block decisions;
- six findings;
- `freshness_clean=False`, including a `cross-session-leak` finding;
- PCFs still `VERIFIED` as evidence bundles.

Important: a verified PCF proves the evidence was signed and is internally consistent. It does not mean the naive isolation control held. The naive run intentionally demonstrates the leak.

## 4. UI walkthrough

Use the Linear-style sidebar and `Ctrl+K` command palette. Sections are Overview, Test Runs, Findings, Evidence & PCFs, Verification and Settings. Red Lab, Blue Lab and Isolation are views under Test Runs; Audit and Trust Report are under Evidence; Browser Verifier and Judge Challenge are under Verification.

1. **Overview**
   - Inspect service health. Unavailable services show `DISCONNECTED`/`UNAVAILABLE`, not green.
   - Confirm the model badge says `MOCK MODEL`.
   - Confirm ledger status comes from `/v1/ledger/verify`.
   - Open recent runs and latest PCF verification.

2. **Test Runs**
   - Use **New run** to create a hardened run.
   - Confirm mode, model kind, run status, findings, commitment and reveal state are visible in the runs table and detail panel.
   - Inspect a finding's PCF; verify the server-side PCF and open it in the browser verifier.

3. **Blue Lab**
   - Confirm Blue reachability from `blue_health`, not from a hardcoded seal badge.
   - Inspect recent finalized runs, verdict counts and released findings.
   - In naive mode, defence rules are expected to be visible; that is the explicit baseline.

4. **Isolation**
   - Compare hardened and naive summaries.
   - Confirm the six canary channels distinguish CLEAN, LEAK, PARTIAL and UNTESTED.
   - Confirm the boundary map is populated from `/v1/dashboard/isolation`, not from frontend constants.
   - Container/network probes remain UNTESTED without Docker.

5. **Evidence & PCFs**
   - Search the event timeline.
   - Use **Verify again** and confirm the chain/checkpoint/anchor status.
   - Run a controlled tamper test. It operates on an exported copy; the live ledger is untouched.
   - Upload a PCF and inspect its verification result and anchor source.

6. **Findings**
   - Inspect severity, model adapter, benchmark version, ledger sequence, checkpoint, anchor reference and selected-PCF verification.
   - Open the PCF panel and inspect signer/witness key IDs, signature domain/algorithm, anchor source and verifier issues.
   - Download the PCF and open the browser verifier.

7. **Verification -> Judge Challenge**
   - Start the challenge.
   - Copy the scoped command.
   - Run it in the Red container when Compose is available, or use the local command against the local stack.
   - Inspect the recorded boundary attempts.
   - Use **Reset view** only to clear the local UI state. It does not delete ledger evidence or revoke the token.

8. **Evidence & PCFs -> Trust Report**
   - Start the suite and read the status legend: PASS, FAIL, ERROR, UNTESTED.
   - Review the LLM-02 model-safety FAIL and the Docker-dependent UNTESTED tests. Do not present either as a PASS.
   - Load the Trust Report and export JSON, HTML and PDF.

9. **Settings**
   - Switch light/dark theme, collapse the sidebar, update the browser admin token, inspect read-only runtime state and open the command palette.

## 5. Verify a PCF independently

With the anchor service running:

```bash
python -m bastion_cli.main verify var/findings/<finding>.json --anchor http://127.0.0.1:8004
```

Expected: `VERIFIED`, `anchor: external (independent)`.

Without `--anchor`, the verifier checks embedded anchor entries but prints `anchor: embedded (not independent)`.

In the browser verifier:

- load a PCF;
- load pinned keys from the gateway or from an out-of-band file;
- press **Verify in this browser**;
- inspect the checked PCF signer, pinned signer, pinned witness, signature domain/algorithm, signed bytes, anchor source and the named failing check if it does not verify.

## 6. Export the Trust Report

Start the stack with the latest suite results present, then:

```bash
python -m bastion_cli.main report
```

Outputs:

```text
var/reports/trust-report.json
var/reports/trust-report.html
var/reports/trust-report.pdf
var/reports/suite_results.json
```

The report summary must match the challenge result statuses. The report contains a model-safety FAIL and UNTESTED rows when the local conditions match this review. Those are not failures to hide.

## 7. Stop the stack

```bash
python scripts/stop_dev.py
```

Confirm no listener remains on the service ports.

## Prerequisites and limits

- Container tests require Docker Compose and must be run with `BASTION_RUNTIME=docker`.
- Real-model tests require a non-mock adapter and a separate stochastic-results disclosure.
- Network probes are controlled local negative controls: loopback ports and a reserved `.invalid` name. They never target public Internet or real cloud metadata endpoints.
- Timing distinguishability requires at least five allow and five block samples per mode; the mock demonstration may leave `TIM-01` UNTESTED.
- Do not use the demo credentials in production.
- Do not run `--clean` against a ledger you need to preserve.
- Do not treat a verified PCF as proof that the tested control held; read the PCF's canary/freshness evidence and the Trust Report.

## Recovery

| Symptom | Recovery |
|---|---|
| Port already in use | `python scripts/stop_dev.py`, confirm ports are free, restart |
| Gateway unavailable | Check `var/logs/gateway.log`, service ports, `.env` credentials |
| Witness unavailable | Restart witness; a checkpoint request should return 502 while it is down |
| Anchor unavailable | Restart anchor; ledger verification should report `anchor-unavailable`/FAILED until it returns |
| Stale Trust Report | Run the full suite, keep the stack running, then `python -m bastion_cli.main report` |
| LLM-02 FAIL | Treat as model-safety evidence. Change model/adapter only through a deliberate test change; never relabel it PASS |
| Old/corrupt witness state | Restore the signed state backup; do not reset a live witness state just to continue |
| Docker missing | Install Docker Engine/Compose, set a disposable `.env`, then run the container integration |
