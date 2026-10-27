# Five-minute demo script

## Pre-flight

```bash
python scripts/dev.py --demo --once --clean
python scripts/dev.py            # leave the arena running (terminal 1)
npm --prefix apps/web run dev    # terminal 2
```

Open `http://127.0.0.1:5173`. Confirm the header says **LEDGER VERIFIED** and **HARDENED**.

If Docker is available:

```bash
cp .env.example .env       # explicit development credentials only
docker compose up --build -d
# open http://localhost:8080
```

Do not reuse `.env.example` for production; use `.env.production.example` and follow the production section in `docs/runbook.md`.

Record a backup video before the event. Use the mock model on stage; keep `MOCK_LLM=1`-style determinism.

## 0:00–0:30 — Set the frame

> “Most AI safety products ask you to trust their dashboard. We hand you a file you can verify offline. Every green check on this screen has a receipt, or it says UNTESTED.”

Point at the integrity banner and the evidence IDs under the numbers.

## 0:30–1:30 — Same attacks, opposite outcome

1. Open **Isolation**.
2. Press **Run both baselines**.
3. In the naive card, point at the canary heatmap: filesystem, logs, egress and model-context leaks; the freshness probe says **LEAK**.
4. In the BastionLoop card: channel map clean, freshness **clean**, timing p-value reported.

> “The naive baseline is deliberately unsafe. It exists to show what the isolation changes. We are not painting a green check; this is the same corpus, same model, different isolation.”

## 1:30–2:30 — Verify the proof

1. Open **Findings**, select a finding, press **Inspect PCF**.
2. Show commit-reveal, session ID, policy hash, checkpoint and anchor.
3. Press **Verify in browser**. The page recomputes the signature, chain, Merkle root, both checkpoint signatures, the anchor chain and commit-reveal with WebCrypto — no Python verifier. It fetches the anchor entries separately from `/v1/anchor`; if that fetch is unavailable it labels the result **VERIFIED · EMBEDDED ANCHOR** instead of claiming independent anchoring.
4. Press **Verify** again after editing one field in the JSON (or use the Audit tamper simulator). It fails, and the failing check is named.

> “The Python verifier and the browser verifier are independent. If they disagree, the evidence is not trustworthy.”

## 2:30–3:30 — Let the judge attack it

1. Open **Judge challenge**, press **Start judge challenge**.
2. Copy the command, run it in the Red container:

```bash
docker compose exec red python -m workers.red.challenge \
  --gateway http://gateway:8000 --token <TOKEN> --run <RUN_ID>
```

3. Show the denials and the **Audit** timeline. Every attempt is a signed ledger event.
4. Return to **Findings** and hand the judge the challenge run's PCF.

> “Try to read the Blue canary. We'll sign your attempt.”

## 3:30–4:30 — Break the evidence

1. Open **Audit**.
2. Press **Edit + re-chain**. The verifier still fails because the checkpoint/merkle root and anchor no longer match.
3. Press **Truncate + re-chain**. The anchor catches the rollback.
4. Point at the disposable-copy label.

> “An admin with database control can rewrite the whole hash chain. The witness signature and the external anchor are what make truncation visible.”

## 4:30–5:00 — Close on honesty

1. Open **Suite & report**.
2. Show PASS/FAIL/UNTESTED/RECORDED.
3. Download the PDF.
4. Read one non-claim and one residual risk.

> “A pass means the tested control held on the tested path. We tell you what we did not test. That is the difference between a safety score and safety evidence.”

## Fallbacks

- If the model is slow, keep the mock adapter and explain that the PCF records the adapter and response hash.
- If Docker is unavailable, run the judge script locally with `--runtime local`; it skips direct network probes and says so.
- If the live tamper button misbehaves, use the CLI: `bastion tamper --mode truncate-rechain`.
- Keep a recorded video of the full flow.
- Never tamper with the evidence history you present as valid; use the disposable copy.
