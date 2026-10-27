# Runbook

## Local start / stop

```bash
python scripts/dev.py                 # blocking; Ctrl+C stops all services
python scripts/dev.py --no-block      # start and return
python scripts/stop_dev.py            # stop the recorded PIDs
python scripts/dev.py --demo --once --clean   # full demo, then stop
```

Logs: `var/logs/{service}.log`. PIDs: `var/logs/pids.json`.

## Compose — development

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f gateway
docker compose down
docker compose down -v    # resets ledger, keys, tenants and findings
```

Dashboard: `http://localhost:8080`. Only the web edge is published; the gateway and tenants are internal. `.env.example` is explicitly development-only and contains the known demo credentials.

## Compose — production

The production path is fail-closed. The gateway refuses to start without a provisioned control key and a signed policy bundle; signer and witness refuse to start without their private keys; missing or weak credentials abort configuration loading.

1. Generate credentials and replace every placeholder in `.env.production.example`:

```bash
cp .env.production.example .env
python - <<'PY'
import secrets
print("BASTION_ADMIN_TOKEN=" + secrets.token_hex(32))
print("BASTION_INTERNAL_TOKEN=" + secrets.token_hex(32))
PY
```

Set `BASTION_ENV=production`, `BASTION_RUNTIME=docker`, a real `sha256:` image digest, and keep `BASTION_ALLOW_KEY_GEN`, `BASTION_ALLOW_NAIVE`, `BASTION_ALLOW_TAMPER` and `BASTION_ALLOW_JUDGE` at `0`. Leave `BASTION_CORS_ORIGINS` empty for the same-origin web edge.

2. Provision keys and a signed policy bundle on a trusted machine:

```bash
mkdir -p provision
BASTION_ENV=development BASTION_DATA_DIR=$PWD/provision \
  python -m bastion_cli.main keys init

mkdir -p provision/policies
cp security/policies/policy.json provision/policies/policy.json
BASTION_ENV=development BASTION_DATA_DIR=$PWD/provision \
  python -m bastion_cli.main policy sign \
  --bundle provision/policies/policy.json \
  --key provision/keys/control.pem
```

`provision/keys` now holds `signer.pem`, `witness.pem` and `control.pem`; `provision/pinned` holds the public keys; `provision/policies` holds the policy and `.sig`.

3. Create the Compose volumes and copy each item into its own volume. The project name is `bastionloop`, so the volume names are `bastionloop_signer-keys`, `bastionloop_witness-keys`, `bastionloop_control-keys`, `bastionloop_pinned` and `bastionloop_policies`.

```bash
docker compose create
docker run --rm -v bastionloop_signer-keys:/keys -v "$PWD/provision/keys:/src:ro" alpine \
  sh -c 'cp /src/signer.pem /keys/ && chown 10001:10001 /keys/signer.pem'
docker run --rm -v bastionloop_witness-keys:/keys -v "$PWD/provision/keys:/src:ro" alpine \
  sh -c 'cp /src/witness.pem /keys/ && chown 10001:10001 /keys/witness.pem'
docker run --rm -v bastionloop_control-keys:/keys -v "$PWD/provision/keys:/src:ro" alpine \
  sh -c 'cp /src/control.pem /keys/ && chown 10001:10001 /keys/control.pem'
docker run --rm -v bastionloop_pinned:/pinned -v "$PWD/provision/pinned:/src:ro" alpine \
  sh -c 'cp /src/*.pub /pinned/ && chown 10001:10001 /pinned/*.pub'
docker run --rm -v bastionloop_policies:/policies -v "$PWD/provision/policies:/src:ro" alpine \
  sh -c 'cp /src/policy.json /src/policy.sig /policies/ && chown 10001:10001 /policies/*'
```

4. Start and verify:

```bash
docker compose up --build -d
docker compose ps
docker compose exec gateway python -m bastion_cli.main health
docker compose exec gateway python -m bastion_cli.main verify /data/findings/<finding>.json
```

The gateway will not start if the control key or signed policy is missing. Signer and witness will not start without their private keys. There are no fallback demo credentials in `compose.yaml`.

## Run an evaluation

```bash
# Admin token
export BASTION_ADMIN_TOKEN=dev-admin-token

# Create and start a run through the CLI or the Red lab UI
python -m bastion_cli.main demo --mode hardened --benchmark jailbreakbench-subset.v1 --cases 6
```

Inside Compose:

```bash
docker compose exec gateway python -m bastion_cli.main health
docker compose exec gateway python -m bastion_cli.main suite --report
```

## Judge challenge

1. Open **Judge challenge** in the UI and press **Start judge challenge**.
2. Copy the issued command and run it inside Red:

```bash
docker compose exec red python -m workers.red.challenge \
  --gateway http://gateway:8000 --token <TOKEN> --run <RUN_ID>
```

3. Open **Audit** and show the `iam.denied`, `gateway.dlp.block` and canary events.
4. Open **Findings**, download the PCF and verify it in **Browser verifier**.

The token is scoped to the run and expires in 30 minutes. It is not an admin token.

## Verify evidence

```bash
python -m bastion_cli.main verify finding.json
python -m bastion_cli.main verify ledger-export.json
python -m bastion_cli.main verify finding.json --anchor http://127.0.0.1:8004
```

Exit code 0 means VERIFIED; non-zero means FAILED and the first broken link is printed. Without `--anchor`, the verifier can only check anchor entries embedded in the PCF and prints `anchor: embedded (not independent)`. `--anchor` makes the anchor check independent.

Browser verifier: open `/verifier`, drop a PCF, fetch or drop pinned keys, press verify. It fetches `/v1/anchor` separately; if that fails, the verdict is `VERIFIED · EMBEDDED ANCHOR`, not an independent anchor claim. To export pinned keys:

```bash
python -m bastion_cli.main export-pinned pinned-keys.json
```

## Repeatable integration validation

Prerequisites:

- Python 3.11+ with `pip install -e ".[dev]"`.
- Ports `8000`-`8007` and `8010` free.
- A disposable `var/` directory; `--clean` deletes it.
- Docker is optional. Without Docker, namespace/volume/cgroup/network tests are explicitly `UNTESTED`, not passed.

```bash
python scripts/integration_test.py --clean --allow-model-failures
python scripts/integration_test.py --clean --faults --allow-model-failures
# equivalent convenience targets:
make integration
make integration-faults
make integration-strict
```

The script starts the local stack, runs the suite, writes `var/reports/suite_results.json`, and exits non-zero on any `ERROR` or infrastructure `FAIL`. `--allow-model-failures` only relaxes a model-safety `FAIL` (category `llm`); it never relaxes `ERROR`, missing evidence, access, audit or network failures. `--faults` stops the witness and anchor after the suite and asserts that checkpoint creation returns `502` and ledger verification reports `anchor-unavailable`/`FAILED` rather than a pass.

Every result contains `expected`, `actual`, `status`, `evidence_id`, `limitations`, `test_kind` and, for model tests, `model_adapter`. `test_kind` is `deterministic-mock` when `BASTION_MODEL_ADAPTER=mock`; a real adapter is labelled `real-model` and stochastic. No public Internet or live cloud metadata endpoint is used by the network probes; defaults are loopback closed ports and an RFC 2606 `.invalid` name. Set `BASTION_PROBE_EGRESS_URL`, `BASTION_PROBE_METADATA_URL` and `BASTION_PROBE_DNS_NAME` only to controlled endpoints you own.

## Trust Report

```bash
python -m bastion_cli.main suite --report
python -m bastion_cli.main report
```

Outputs in `var/reports/`:

- `suite_results.json`
- `trust-report.json`
- `trust-report.html`
- `trust-report.pdf`

## Troubleshooting

| Symptom | Check |
|---|---|
| Gateway health is slow | It probes six services with 0.4s timeouts; check service logs |
| `run failed` with signing error | Signer/witness/anchor not healthy or internal credential mismatch |
| `policy denied` for admin | Admin token does not match `BASTION_ADMIN_TOKEN` |
| `service error: ... internal service credential required` | `BASTION_INTERNAL_TOKEN` differs between services, or a client called a protected service directly |
| Browser verifier says NO KEYS | Drop `pinned-keys.json` or use the gateway button |
| Witness refuses with “predates stale-checkpoint protection” | Restore the signed witness state backup; do not reset it for a live arena. Only a disposable fresh arena may start with a new witness state. |
| Gateway will not start in production | Missing/weak tokens, `BASTION_RUNTIME=local`, `BASTION_ALLOW_*=1`, missing control key, or missing/invalid signed policy |
| Compose containers cannot reach Kafka equivalent | This build uses HTTP, not Kafka; check service URLs |
| Port already in use | `python scripts/stop_dev.py` or change ports in `scripts/dev.py` |

## Key rotation

Local:

```bash
python -m bastion_cli.main keys init --force
# restart services and export new pinned keys
```

Compose: remove the `keys` and `pinned` volumes, then recreate. Old evidence will not verify under new keys; export it first.

## Incident response

If the ledger verification fails:

1. Do not overwrite the live ledger.
2. Export it (`GET /v1/ledger/export`) and verify offline.
3. Check the first broken link and the anchor counter.
4. Treat any unanchored tail as suspect.
5. Use the tamper simulator only on a disposable copy.
