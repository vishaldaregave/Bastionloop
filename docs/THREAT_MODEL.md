# BastionLoop threat model

Status: release-review version, 2026-10-27. This document describes the tested and untested boundaries; it is not a production certification.

## Scope and assets

BastionLoop is an adversarial AI evaluation arena. The assets are:

- tenant prompts, responses, payload commitments/reveals and canary values;
- the append-only evidence ledger, signed checkpoints and the external anchor;
- signer, witness and control private keys, and the pinned public-key set;
- the gateway authorization boundary and scoped capability tokens;
- the model session context and the Blue defence configuration;
- the Trust Report and exported PCFs.

## Security objectives

1. A tenant cannot read another tenant's run, findings, files or model context.
2. A capability token cannot exceed its tenant, action or run scope.
3. Red cannot bypass the gateway to reach Blue or the model.
4. Blue and the model cannot be reached without the internal service credential.
5. Every meaningful test result is evidenced and classified honestly.
6. PCF signatures, ledger checkpoints and anchor entries are independently verifiable.
7. A failed, timed-out or missing control is never presented as PASS.
8. Signing keys are not readable from tenant containers.

## Actors and trust boundaries

| Actor | Capability | Trust boundary |
|---|---|---|
| Red tenant | Attacker-controlled prompts, scoped token, gateway route | Untrusted tenant |
| Judge | Scoped Red token and shell command | Semi-trusted operator, untrusted inputs |
| Blue cell | Verdict logic, no tenant network | Sealed control plane |
| Model service | Per-session inference, internal API | Trusted service, mock or real adapter |
| Gateway | Tokens, policy, tenant ownership, run mediation | Trusted control plane |
| Notary | Sole ledger writer, no signing key | Trusted evidence service |
| Signer / witness | Split Ed25519 signing and anti-rollback state | High-value key services |
| Anchor | External checkpoint hash chain | Separate append-only store; public reads |
| Host administrator | Host and container control | Trusted before signing; compromise is a stated non-claim |

## Threats, controls and evidence

| Threat | Control | Evidence / test | Release status |
|---|---|---|---|
| Cross-tenant run read/write | Capability tenant and run ownership checks in gateway | `IAM-02`, `tests/test_gateway_authz.py` | VERIFIED |
| Cross-tenant model session access | Model API requires internal credential; tenant bearer token is rejected | `IAM-04`, `SVC-01` | VERIFIED locally |
| Unauthorized privileged endpoint | Admin/action/run-scope policy and denial events | `IAM-01`, `IAM-03`, gateway tests | VERIFIED |
| Direct service call without credential | `X-Bastion-Internal` required on signer, witness, anchor writes, notary, model, Blue, Red and suite | `SVC-01`, `tests/test_service_auth.py` | VERIFIED locally |
| Cross-session context contamination | Per-session model manager in hardened mode; shared context only in naive baseline | `LLM-01` | VERIFIED for mock demo |
| Canary leakage across six channels | Per-channel canaries; commitments only; scan by source/target channel | `DLP-01`, `LLM-03`, canary tests | VERIFIED for tested encodings |
| Encoded canary / secret exfiltration | DLP plain/lower/base64/base64-nopad/hex/spaced/dehyphenated/dashed plus secret patterns | `DLP-01`, `LLM-03`, `tests/test_canaries_dlp.py` | VERIFIED for supported encodings |
| Red -> Blue or Red -> model direct access | Separate Compose tenant networks and internal service auth | `NET-01` | **UNTESTED** (Docker unavailable) |
| Controlled egress, DNS and metadata-shaped probes | Loopback closed-port targets and reserved `.invalid` DNS; no public Internet or real metadata target | `NET-02`, `NET-03` | **UNTESTED** (Docker unavailable) |
| Host filesystem or container escape | Read-only tenant root, cap drop, no-new-privileges, seccomp, volume isolation | `ISO-01..03` | **UNTESTED** (Docker unavailable) |
| Resource exhaustion / DoS | Pydantic request bounds, bounded concurrency, Compose cgroup limits | `RES-02`, `RES-03`; `RES-01` | PARTIAL: local bounds PASS; cgroup test UNTESTED |
| Ledger edit/delete/reorder/truncate | Hash chain, SQLite append-only triggers, immutable checkpoint fields, external anchor | `AUD-01..03`, `tests/test_verifier.py`, adversarial tests | VERIFIED |
| Rollback of a re-chained truncated ledger | Previously trusted checkpoint/anchor comparison | `AUD-03`, `EVD-02`, verifier tests | VERIFIED for supplied anchor |
| PCF field/payload/keys tamper | Canonical signing, domain separation, pinned keys, exact signed payload, schema checks | `tests/test_evidence_adversarial.py`, `tests/test_pcf.py` | VERIFIED |
| Checkpoint content/signature tamper | Signer + witness signatures over canonical checkpoint; pinned key IDs | adversarial and verifier tests | VERIFIED |
| Missing witness or anchor evidence | Verifier returns FAILED with explicit codes; embedded anchor is labelled not independent | `EVD-02`, PCF tests | VERIFIED |
| Witness unavailable | Notary checkpoint fails 502; no unsigned pass | live fault injection | VERIFIED |
| Anchor unavailable | Ledger verification returns FAILED / `anchor-unavailable` | live fault injection | VERIFIED |
| Secret/key material in repository | Ignore runtime state; split key volumes; production rejects demo credentials | secret scan | VERIFIED for reviewed tree |
| Model safety failure | DLP/verdict layer; model outcome measured separately | `LLM-02` | **FAIL** (mock disclosed synthetic secret) |
| Real-model safety/behavior | Adapter-specific run | none | **UNTESTED** (mock only) |
| Timing side channel | Fixed-latency padding; Mann-Whitney samples | `TIM-01` | **UNTESTED** (insufficient samples) |
| Browser UI misleading status | Backend-bound statuses, `ERROR`/`UNTESTED`/`DISCONNECTED` states; no hardcoded seal | frontend build; browser automation not run | Build VERIFIED; runtime **UNTESTED** |
| Trust Report inconsistency | Report totals derived from challenge statuses; integrity included | report consistency assertion | VERIFIED |

## Controlled network probe policy

The Red and Blue probes do not target arbitrary Internet services or real cloud metadata endpoints during testing. Defaults are:

```text
BASTION_PROBE_EGRESS_URL=http://127.0.0.1:9/
BASTION_PROBE_METADATA_URL=http://127.0.0.1:9/latest/meta-data/
BASTION_PROBE_DNS_NAME=bastionloop-egress.invalid
```

Operators may set these only to controlled endpoints they own. Local negative controls do not prove Internet-wide egress isolation; the Compose boundary tests are required for that claim.

## Trust assumptions and non-claims

- The host kernel and container runtime are trusted before signing. A host administrator who compromises the host can alter evidence before it is signed.
- A stolen signer key can sign a false PCF. A stolen signer + witness combination defeats the split-key control.
- The verifier trusts the out-of-band pinned-key distribution channel. A public key embedded only in a PCF is ignored.
- An embedded anchor is internally checked but is not an independent anchor claim.
- Rollback detection is bounded by the latest anchor entry supplied to the verifier. A newer anchor withheld by an operator is not detected.
- The internal service credential is a shared service secret; compromise of one service compromises that boundary.
- The mock model is deterministic test equipment, not a real-model safety claim.
- A PASS means the tested control held on the tested path. It does not prove the absence of unlisted attacks, host compromise or hardware side channels.
- No public Internet or real cloud metadata exploit is attempted.

## Release-review gaps

- Docker/Compose execution was unavailable. Container, network and cgroup controls remain UNTESTED; see `docs/RELEASE_STATUS.md`.
- `LLM-02` is a model-safety FAIL.
- `TIM-01` is UNTESTED because the mock runs did not provide the required allow/block sample distribution.
- Only the mock adapter was exercised.
- The production frontend build passed; a browser runtime/visual pass was not executed.
- Production provisioning, image-digest attestation and public transparency-log operation were not exercised.

## Related design references

The lower-case `docs/architecture.md`, `docs/residual-risk.md` and `docs/runbook.md` describe the implementation. This uppercase file is the release-review threat model; `docs/RELEASE_STATUS.md` is the release gate.
