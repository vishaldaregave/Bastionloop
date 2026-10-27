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
| `services/signer` | Ed25519 signing of checkpoints and PCFs | Signer key volume only; never in a tenant container; internal credential required |
| `services/witness` | Independent checkpoint co-signature, monotonic counter | Witness key volume only; refuses rollback; separate network; internal credential required |
| `services/anchor` | Append-only checkpoint root store | Outside the notary database |
| `services/challenge_suite` | Executes tests, writes a ledger evidence reference for every result, builds Trust Report | Trusted control plane |
| `workers/model` | Mock/Ollama adapter, one session per test | No direct tenant exposure |
| `workers/blue` | Rule-based verdicts, no egress in Compose | Returns verdicts only |
| `workers/red` | Probe server and judge challenge script | Untrusted; gateway-only route |
| `apps/web` | Evidence console and browser verifier | No server trust for verification |

Every sensitive service route (signer, witness, anchor writes, notary reads/writes, model sessions, Blue verdicts, Red probes and suite reports) requires the internal service credential in addition to any network placement. The gateway's tenant routes enforce capability tokens, policy, tenant ownership and run scope. Signing keys are split across separate volumes so the gateway cannot read the signer or witness private key.

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

Hash input is the canonical JSON of the record without `event_hash`, prefixed by the previous hex hash. SQLite triggers reject event `UPDATE`/`DELETE` and reject updates to signed checkpoint fields; only `anchor_ref` may be filled in after anchoring. The notary is the only writer. `checkpoints` cover all events up to a sequence, with a Merkle root over event hashes. Checkpoints are signed by the signer and cosigned by the witness. The anchor stores the checkpoint hash, Merkle root and last hash in a separate JSONL file with its own hash chain.

## Checkpoint and PCF signing

- Checkpoint signing input: `{"domain":"bastionloop-checkpoint-v1","checkpoint":{counter,upto_seq,last_hash,merkle_root,created_at},"checkpoint_hash":...}`.
- PCF signing input: canonical JSON of the PCF without `signatures`, plus `"domain":"bastionloop-pcf-v1"`.
- The exact signed bytes are embedded as `signatures.signer.payload_b64`, so a browser can verify the signature without reproducing Python float formatting. The verifier requires the embedded bytes to equal the canonical bytes of the current document; changing a signed field is rejected even if the attacker keeps the old signature.
- The PCF ledger proof includes `canonical_records`: the exact canonical bytes for each event. A browser recomputes `SHA256(prev_hash || canonical_bytes)` and compares `event_hash`.
- The signer validates the complete PCF schema before signing. The verifier validates required fields, signature domain/algorithm, payload commitment and payload hash, chain event ID/hash, run ID, finding ID, prompt/response/policy hashes, checkpoint reference and anchor entry.

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

## Challenge-suite status model

Every suite result records `test_id`, `expected`, `actual`, `status`, `evidence_id` (`ledger:<event_id>`), `evidence_seq`, `evidence_hash`, `limitations`, `test_kind` and, for model tests, `model_adapter`. `status` is exactly one of `PASS`, `FAIL`, `ERROR`, `UNTESTED`:

- `PASS`: the tested control held on the tested path.
- `FAIL`: the test executed and observed behavior that violated its expected outcome (including a model-safety outcome).
- `ERROR`: a harness, timeout, service, or evidence-write failure prevented completion. It is never counted as a pass.
- `UNTESTED`: a declared prerequisite is absent (Docker namespaces, cgroups, or insufficient samples); the result explains how to run it.

`test_kind=deterministic-mock` distinguishes the mock adapter from `real-model`, which is stochastic and must not be presented as reproducible. Network probes use controlled local loopback/`.invalid` negative controls; they never target public Internet or real cloud metadata endpoints.

Verification accepts a pinned signer/witness key only from the pinned directory or the pinned-keys file supplied out of band; a public key carried inside the PCF is ignored. Public keys and the external anchor are trust inputs, not evidence.

An anchor supplied inside the PCF is checked for internal consistency but is reported as `anchor_source=embedded` / `independent_verification=false`. To make an independent anchor claim, pass `bastion verify --anchor <anchor-url>` or supply anchor entries fetched separately. Missing witness signatures, missing checkpoints and missing anchor evidence are fatal, not silently treated as a pass. Checkpoint counters must be contiguous and increasing, checkpoint `upto_seq` must increase, and duplicate or out-of-order checkpoints are rejected.

The verifier detects rollback only up to the latest checkpoint recorded by the independent anchor. It cannot prove that the latest anchor entry is the newest one that exists, and it does not protect against a compromised host administrator, a stolen signer+witness key, or a compromised pinned-key distribution channel.
