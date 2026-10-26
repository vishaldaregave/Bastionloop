# Runbook

## Local start / stop

```bash
python scripts/dev.py                 # blocking; Ctrl+C stops all services
python scripts/dev.py --no-block      # start and return
python scripts/stop_dev.py            # stop the recorded PIDs
python scripts/dev.py --demo --once --clean   # full demo, then stop
```

Logs: `var/logs/{service}.log`. PIDs: `var/logs/pids.json`.

## Compose

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f gateway
docker compose down
docker compose down -v    # resets ledger, keys, tenants and findings
```

Dashboard: `http://localhost:8080`. Only the web edge is published; the gateway and tenants are internal.

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

Exit code 0 means VERIFIED; non-zero means FAILED and the first broken link is printed.

Browser verifier: open `/verifier`, drop a PCF, fetch or drop pinned keys, press verify. To export pinned keys:

```bash
python -m bastion_cli.main export-pinned pinned-keys.json
```

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
| `run failed` with signing error | Signer/witness/anchor not healthy |
| `policy denied` for admin | Admin token does not match `BASTION_ADMIN_TOKEN` |
| Browser verifier says NO KEYS | Drop `pinned-keys.json` or use the gateway button |
| Compose containers cannot reach Kafka equivalent | This build uses HTTP, not Kafka; check service URLs |
| Port already in use | `python scripts/dev-stop` or change ports in `scripts/dev.py` |

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
