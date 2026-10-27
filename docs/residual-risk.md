# Residual risk register

A passing suite means the tested controls held on the tested path. It does not mean the arena is secure.

| Threat | Control | Residual risk | Future fix |
|---|---|---|---|
| Cross-tenant file access | Private volumes, non-root, read-only rootfs | Kernel or runtime escape (shared kernel) | gVisor, Kata or Firecracker microVMs |
| Unauthorized API access | Signed capability tokens, deny-by-default policy | Bug in policy or gateway code | Formal verification of policy rules |
| Network pivoting | Internal networks, gateway-only bridge, no tenant ports | Host networking mistakes | Per-tenant VMs, network audit in CI |
| Cross-session context leakage | One model instance per session, canary freshness probe | Untested runtime paths, shared weights or caches | Per-tenant inference runtimes, confidential computing |
| Audit tampering | Hash chain, split signer, witness, external anchor, immutable checkpoint fields | Compromised signer and witness together, or malicious host admin before signing | Public transparency log, hardware attestation |
| Evidence tampering | Signed canonical PCF, exact signed bytes, schema and cross-field checks, Merkle checkpoints | A stolen signer key can sign a false PCF; a compromised host can lie before signing | Hardware-backed keys, transparency log, attested builds |
| Rollback after anchor outage | Witness monotonic counter, external anchor comparison, checkpoint sequence checks | Verification only sees the latest anchor entry supplied; a newer anchor that is withheld cannot be detected | Poll a public log with independent witnesses, gossip |
| Embedded anchor substitution | Embedded anchor entries are checked but labelled `anchor_source=embedded` | A self-contained PCF cannot prove its own anchor is external | Always verify with `--anchor` or compare the anchor counter out of band |
| Timing side channels | Fixed-latency verdict padding, Mann-Whitney measurement | Raw LLM latency variance, hardware cache channels | Batching, dedicated cores, microarchitectural isolation |
| Resource interference | cgroup caps, load test vs baseline | Shared disk, network and timing effects | Dedicated hosts or queues per tenant |
| Prompt injection and jailbreaks | Output validation, DLP, permissions in code | Novel attacks, model-dependent failures | Continuous benchmark refresh |
| Gateway as single trust point | Small code surface, pinned image digest in every PCF | Gateway compromise breaks mediation | Split gateway, attested builds |
| False conclusions | Versioned datasets, reproducible configs, explicit PASS/FAIL/ERROR/UNTESTED statuses, evidence provenance | Judge error, incomplete coverage, stochastic model outputs | Broader suites, repeated runs, real-model repetition |
| Container/network coverage unavailable | Tests report UNTESTED with prerequisites; network probes use controlled local negative controls | Local runs cannot attest namespace, cgroup or real egress isolation | Run `docker compose up --build` and `make integration-faults` |

## Open gaps in this build

- Compose isolation is implemented but was not exercised on this workstation because Docker is unavailable here. The local stack exercises policy, ledger, PCF, suite and UI only.
- The K8s manifests from the earlier plan are not part of this build; Compose is the deployment artifact.
- The default `mock` model makes the demo deterministic. A real Ollama model introduces latency variance and stochastic outputs; the PCF records the adapter and response hash, but reproducibility is weaker.
- The witness and anchor are co-located on one host in this demo. A real deployment should put the witness on a second host and the anchor in a public transparency log.
- The seccomp profile is an explicit deny-list, not a default-deny allowlist. It is a hardening layer, not a proof.
- A PCF's embedded anchor entries are not independent evidence. The verifier labels them and reports `independent_verification=false`; independence requires an anchor fetch supplied out of band.
- Rollback detection is bounded by the latest anchor entry the verifier is given. A malicious operator that can withhold newer anchor entries from the verifier is not detected by this build.
- The verifier trusts the pinned public-key files and the channel that delivered them. If both the signer key and that distribution channel are compromised, signatures prove nothing.
- Corrupted witness state now fails closed, but a host administrator can still delete the state and the witness key volume together; the external anchor is the backstop.
- Verification does not prove the model was not compromised, does not prove the host kernel is intact, and does not prove that every possible attack path was tested.
- The suite's network probes are controlled local negative controls (loopback/`.invalid`), not a general Internet egress measurement. They deliberately avoid public Internet and real cloud metadata targets.
- A model-safety `FAIL` is reported separately from infrastructure failures; a deterministic mock-model result does not generalize to a real model.
- `ERROR` means the test did not complete. It is not evidence that a control held and must not be counted as a pass.
- Container, volume, network and cgroup tests remain `UNTESTED` on this workstation because Docker is unavailable.

## Non-claims

- No protection from a container escape through a host kernel exploit.
- No protection from hardware side channels (cache, Spectre class).
- No protection from a compromised host administrator acting before events are signed.
- No GPU memory claim on this CPU-only build.
- A pass means the tested control held on the tested path, not that the arena is secure.
- A `VERIFIED` PCF with `anchor_source=embedded` is internally consistent, not independently anchored.
- A clean verification does not prove the absence of a newer checkpoint, a newer anchor entry, or a rollback that occurred before the latest independently observed anchor.
