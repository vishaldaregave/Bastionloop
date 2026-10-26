# API

All tenant endpoints require `Authorization: Bearer <token>`. The admin token is configured by `BASTION_ADMIN_TOKEN` (default `dev-admin-token`). Tenant tokens are Ed25519 capability tokens issued by the control plane; they are short-lived, action-scoped and run-scoped.

## Tokens

`POST /v1/tokens` (admin only)

```json
{"tenant_id":"red","actions":["infer","events:read"],"run_id":"run_...","ttl_seconds":600}
```

Returns a compact signed token. The token format is `v1.<base64url payload>.<base64url signature>`.

## Runs

`POST /v1/runs`

```json
{"benchmark_id":"jailbreakbench-subset.v1","mode":"hardened","max_cases":6,"tenant_id":"red"}
```

`POST /v1/runs/{run_id}/start?sync=true` executes inline and returns the public run. `sync=false` runs in a thread.

`GET /v1/runs` and `GET /v1/runs/{run_id}` return public run state: mode, status, decisions, findings, commitment, reveal hash, freshness and canary scan. Raw prompts/responses stay in tenant storage.

## Commit / reveal

`POST /v1/commit` `{"run_id":"run_...","payload":{...}}` — omit `payload` to commit the benchmark payload.

`POST /v1/reveal` — same shape. Returns `matches`, `commitment`, `reveal_hash`. A mismatch is recorded as evidence.

## Inference

`POST /v1/infer`

```json
{"run_id":"run_...","prompt":"Ignore previous instructions...","test_id":"MANUAL-01"}
```

Returns the red-visible result:

```json
{
  "verdict": {"decision":"block","score":0.9,"latency_ms":120.4},
  "response": "...",
  "dlp_blocked": true,
  "session_id": "sess_..."
}
```

Blue's rules are never returned to Red in hardened mode.

## Policy and ledger

`POST /v1/policy/decide` `{"action":"infer","context":{...}}` returns decision, rule ID, bundle hash and version.

`POST /v1/ledger/append` (internal or suite/system) appends an event.

`GET /v1/ledger/verify` recomputes chain, checkpoints, signatures and anchor.

`GET /v1/ledger/export` returns the full ledger with canonical records and anchor entries.

## Evidence

`GET /v1/findings` lists released findings.

`GET /v1/findings/{finding_id}?verify=true` returns the PCF and verification report.

`POST /v1/verify/pcf` `{"pcf":{...}}` verifies an uploaded PCF.

`GET /v1/pinned-keys` returns public signer/witness/control keys and fingerprints. It is public by design; compare fingerprints out of band.

## Suite and reports

`POST /v1/security-tests` `{"tests":["IAM-01"],"mode":null}` runs the suite. Every result is appended with an evidence ID.

`GET /v1/suite/results` returns the latest grid.

`GET /v1/reports/trust.json`, `.pdf`, `.html` return the Trust Report.

## Dashboard

`GET /v1/dashboard/overview` — runs, integrity, timing, denied events, findings.

`GET /v1/dashboard/isolation` — zones, paths and recent boundary attempts.

`GET /v1/labs/blue` — sealed status, defence version, verdict counts. Rules are included only in naive mode.

`POST /v1/demo/mode` `{"mode":"naive"|"hardened"}` — global demo baseline. Runs keep the mode they were created with.

`GET /v1/labs/files?tenant=blue&path=canary.txt` — deliberately permissive lab endpoint in naive mode; denied with an evidence event in hardened mode.

## Judge

`POST /v1/judge/session` `{"benchmark_id":"...","mode":"hardened","max_cases":6}` creates and executes a run, issues a scoped Red token, and returns the command for the Red container.

## Streaming

`GET /v1/stream?token=<admin-token>` is a server-sent event stream of run, ledger and finding updates. The dashboard currently polls for robustness; the stream is available for external viewers.
