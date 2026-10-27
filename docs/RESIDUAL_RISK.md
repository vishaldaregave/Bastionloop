# BastionLoop residual risk register

Release-review status: 2026-10-27. This is the release-view register; it does not replace the tested-path non-claims in `docs/residual-risk.md` or `docs/THREAT_MODEL.md`.

## Risk register

| Threat | Control in this build | Residual risk | Evidence / status | Required before production |
|---|---|---|---|---|
| Cross-tenant run access | Tokens, tenant ownership, run scope, denial ledger events | A bug in gateway authorization | `IAM-01..04`, 35 auth tests: VERIFIED | Independent review/fuzzing of every route |
| Cross-tenant session access | Model service internal credential; tenant bearer rejected | Shared internal credential can access any session | `IAM-04`, `SVC-01`: VERIFIED locally | Tenant-bound internal service identity; per-session authorization |
| Direct service calls | `X-Bastion-Internal` on all sensitive services | One compromised service inherits the shared credential | `SVC-01`: VERIFIED locally | Workload identity/mTLS and per-service scopes |
| Container escape / host kernel exploit | Compose non-root, read-only rootfs, cap drop, seccomp deny-list, no-new-privileges | Shared host kernel; seccomp is a deny-list, not a proof | `ISO-01..03`: UNTESTED (Docker unavailable) | Docker-backed tests, gVisor/Kata/microVM evaluation |
| Tenant network pivoting | Separate Compose internal networks, no tenant ports | Host/network misconfiguration; routing errors | `NET-01..03`: UNTESTED (Docker unavailable) | Execute Compose network tests, external network audit |
| Public Internet / cloud metadata risk during tests | Controlled loopback/`.invalid` negative controls | Local negative control does not prove Internet-wide egress blocking | Probe tests PASS; egress isolation UNTESTED | Owned sink tests in an isolated network; never live metadata target |
| Cross-session model contamination | Per-session model in hardened mode; naive baseline intentionally shared | Runtime caches, model implementation, shared weights | `LLM-01`: PASS for deterministic mock | Real-model and multi-process testing |
| Model safety disclosure | DLP, verdict layer, separate model outcome reporting | Deterministic mock disclosed `SYNTHSECRET-*` | `LLM-02`: **FAIL** | Treat as a finding; evaluate the intended real adapter; do not relabel PASS |
| Canary / secret leakage | Six channels, commitments only, supported DLP encodings | Unsupported encodings, real channels not exercised, false negatives | `DLP-01`, `LLM-03`, detector tests: PASS | Broader encoding corpus, real filesystem/env/egress paths |
| Audit tampering by DB admin | Hash chain, append-only triggers, signed checkpoints, external anchor | Signer+witness compromise; host admin before signing | `AUD-01..03`, `EVD-02`: VERIFIED | Hardware-backed keys, transparency log, host attestation |
| Ledger truncation/rollback | Anchor comparison, checkpoint sequence, witness state | A newer withheld anchor is undetectable; historical PCF is valid at its checkpoint | verifier/adversarial tests: VERIFIED for supplied anchor | Independent anchor polling/gossip; define freshness policy |
| PCF tamper / wrong key | Pinned signer/witness keys, canonical signing, domain separation, exact signed payload | Stolen signer key; compromised pinned-key distribution | 19 adversarial tests: PASS | Key distribution ceremony/attestation |
| Embedded anchor substitution | Embedded entries labelled not independent; external fetch preferred | A self-contained PCF cannot prove its own anchor | `EVD-02`, CLI/browser verifier: PASS for tested behavior | Require external anchor in release verification |
| Witness unavailable | Checkpoint creation fails closed with 502 | Notary cannot advance checkpoints while witness is down | fault injection: PASS | Operational witness HA and alerting |
| Anchor unavailable | Ledger verification reports FAILED / `anchor-unavailable` | Existing evidence cannot be independently anchored during outage | fault injection: PASS | Anchor HA, public log monitoring |
| Timing side channel | Fixed-latency padding; Mann-Whitney samples | Real timing variance, host scheduling, hardware cache effects | `TIM-01`: UNTESTED (insufficient samples) | Collect required samples; dedicated hosts |
| Resource exhaustion | Request bounds, bounded concurrency, Compose pids/memory/CPU caps | cgroup limits not exercised locally | `RES-02/03`: PASS; `RES-01`: UNTESTED | Docker cgroup load tests |
| Mock model treated as real evidence | Adapter/mocked status surfaced in UI and reports | A presenter could still overstate mock results | frontend/report labels; release docs | Separate real-model test evidence |
| Stale frontend status | UI consumes backend state, shows disconnected/error/untested | Browser runtime not visually exercised; backend data can be stale | production build PASS; runtime UNTESTED | Browser E2E/visual release check |
| Trust Report inconsistency | Counts derived from result statuses; integrity included | Operator can present a subset/report out of context | report consistency assertion PASS | Signed report publication and scope statement |
| Secret leakage into repository | Runtime `var/`, keys and DBs ignored; production rejects demo credentials | A future commit could add a secret | secret scan PASS for reviewed tree | Pre-commit secret scanning, managed secret store |
| Production provisioning | Fail-closed config, pinned image digest requirement, split key volumes | No actual Docker/prod provisioning run | static Compose PASS; production run UNTESTED | Deploy in staging, rotate keys, verify digests |

## Current release blockers

1. Docker/Compose execution unavailable; 8 container/network/timing/resource controls are UNTESTED.
2. `LLM-02` model-safety FAIL on the deterministic mock.
3. Real-model behavior is untested; only the mock adapter ran.
4. Browser runtime/visual regression testing was not executed; only TypeScript and production build passed.
5. Production provisioning, key ceremony, image attestation and transparency-log operation were not exercised.

## Explicit non-claims

- No protection from a host kernel exploit, container escape, hardware side channel or compromised host administrator before signing.
- No general Internet egress isolation claim from local loopback/`.invalid` probes.
- No claim that a PCF being VERIFIED means the tested isolation control held; read the canary/freshness evidence.
- No claim that the mock model represents a real model's safety behavior.
- No claim that a PASS on one tested path proves the absence of other attack paths.
- No production-readiness claim from the unit suite or static Compose validation alone.

## Gate impact

**Production release: BLOCKED.** The residual risks that block promotion are untested container/network/cgroup isolation, the `LLM-02` model-safety FAIL, absence of real-model validation, and untested production provisioning. The local demonstration is **PARTIAL**: it is useful and evidence-producing, but it must not be presented as a production-ready or fully isolation-verified system.
