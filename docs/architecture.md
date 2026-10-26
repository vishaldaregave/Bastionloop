# Architecture

## Design principle

BastionLoop is built around one rule: **no claim without evidence**. The dashboard is a viewer over computed state. The artifact is the PCF.

```text
Red tenant ──scoped token──▶ Gateway ──▶ Model (per-session)
                                │──▶ Blue (sealed, verdict only)
                                │──▶ Notary (append event)
                                │       │──▶ Signer (checkpoint/PCF)
                                │       │──▶ Witness (co-sign)
                                │       │──▶ Anchor (external root)
                                └──▶ local DLP + fixed-latency padding
```

## Components

| Component | Responsibility | Trust boundary |
|---|---|---|
| `services/gateway` | Token verification, policy decision, run orchestration, DLP, padding, dashboard API, judge session | Single mediation point; small code surface |
| `services/notary` | Sole ledger writer, hash chain, checkpoint creation, Merkle root | Holds no signing key |
| `services/signer` | Ed25519 signing of checkpoints and PCFs | Key never enters a tenant container |
| `services/witness` | Independent checkpoint co-signature, monotonic counter | Refuses rollback; separate network |
| `services/anchor` | Append-only checkpoint root store | Outside the notary database |
| `services/challenge_suite` | Executes tests, writes evidence IDs, builds Trust Report | Trusted control plane |
| `workers/model` | Mock/Ollama adapter, one session per test | No direct tenant exposure |
| `workers/blue` | Rule-based verdicts, no egress in Compose | Returns verdicts only |
| `workers/red` | Probe server and judge challenge script | Untrusted; gateway-only route |
| `apps/web` | Evidence console and browser verifier | No server trust for verification |

## Run lifecycle

1. `POST /v1/runs` creates a run and appends `run.created`.
2. `POST /v1/runs/{id}/start` appends `run.started`.
3. Canaries are planted per channel and commitments are logged.
4. Red's payload is canonicalized and committed (`red.payload.committed`).
5. For each case:
   - a fresh model session is created;
   - the prompt goes to the model;
   - Blue returns a verdict;
   - DLP scans the response for canaries, encodings and secrets;
   - the verdict is padded to a fixed bucket in hardened mode;
   - metadata-only events are appended (`red.attack.sent`, `model.infer`, `blue.verdict`, optional `gateway.dlp.block`).
6. A fresh session probes the model for prior context (`model_context` canary).
7. Six-channel payloads are scanned; leak commitments are logged.
8. The payload is revealed and the commitment is checked (`red.payload.revealed`).
9. Findings are appended (`finding.created`), a signed checkpoint is created, and a PCF is built and signed.
10. `run.finished` records counts, freshness and reveal status.

## Ledger format

Genesis: `SHA256("bastionloop:genesis:v1")`.

Each event stores:

```json
{
  "event_id": "evt_...",
  "ts": "2026-10-26T...",
  "run_id": "run_...",
  "tenant_id": "red",
  "event_type": "blue.verdict",
  "policy_version": "2026.10.26.1",
  "metadata": {"hashes": "only"},
  "prev_hash": "...",
  "event_hash": "..."
}
```

Hash input is the canonical JSON of the record without `event_hash`, prefixed by the previous hex hash. SQLite triggers reject `UPDATE` and `DELETE`. The notary is the only writer. `checkpoints` cover all events up to a sequence, with a Merkle root over event hashes. Checkpoints are signed by the signer and cosigned by the witness. The anchor stores the checkpoint hash, Merkle root and last hash in a separate JSONL file with its own hash chain.

## Checkpoint and PCF signing

- Checkpoint signing input: `{"domain":"bastionloop-checkpoint-v1","checkpoint":{counter,upto_seq,last_hash,merkle_root,created_at},"checkpoint_hash":...}`.
- PCF signing input: canonical JSON of the PCF without `signatures`, plus `"domain":"bastionloop-pcf-v1"`.
- The exact signed bytes are embedded as `signatures.signer.payload_b64`, so a browser can verify the signature without reproducing Python float formatting.
- The PCF ledger proof includes `canonical_records`: the exact canonical bytes for each event. A browser recomputes `SHA256(prev_hash || canonical_bytes)` and compares `event_hash`.

## Naive mode

Naive mode exists only to make the value of isolation visible:

- one shared model session;
- no verdict padding;
- Blue rules exposed;
- a permissive lab file API for the demo.

It is labelled in the run, the PCF and the Trust Report. It never changes authorization: a naive run still uses tokens and policy.

## Verification

Two independent verifiers:

1. **Python** (`bastion verify`, `POST /v1/verify/pcf`) — recomputes the chain, Merkle root, signer/witness signatures and anchor.
2. **Browser** — `/verifier` page recomputes Ed25519 signatures, the hash chain, Merkle root, both checkpoint signatures, the anchor chain and the commit-reveal hash with WebCrypto/tweetnacl. It never calls the Python verifier.

If they disagree, the evidence is not trustworthy.
