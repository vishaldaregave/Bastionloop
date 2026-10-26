# Residual risk register

A passing suite means the tested controls held on the tested path. It does not mean the arena is secure.

| Threat | Control | Residual risk | Future fix |
|---|---|---|---|
| Cross-tenant file access | Private volumes, non-root, read-only rootfs | Kernel or runtime escape (shared kernel) | gVisor, Kata or Firecracker microVMs |
| Unauthorized API access | Signed capability tokens, deny-by-default policy | Bug in policy or gateway code | Formal verification of policy rules |
| Network pivoting | Internal networks, gateway-only bridge, no tenant ports | Host networking mistakes | Per-tenant VMs, network audit in CI |
| Cross-session context leakage | One model instance per session, canary freshness probe | Untested runtime paths, shared weights or caches | Per-tenant inference runtimes, confidential computing |
| Audit tampering | Hash chain, split signer, witness, external anchor | Compromised signer and witness together, or malicious host admin before signing | Public transparency log, hardware attestation |
| Timing side channels | Fixed-latency verdict padding, Mann-Whitney measurement | Raw LLM latency variance, hardware cache channels | Batching, dedicated cores, microarchitectural isolation |
| Resource interference | cgroup caps, load test vs baseline | Shared disk, network and timing effects | Dedicated hosts or queues per tenant |
| Prompt injection and jailbreaks | Output validation, DLP, permissions in code | Novel attacks, model-dependent failures | Continuous benchmark refresh |
| Gateway as single trust point | Small code surface, pinned image digest in every PCF | Gateway compromise breaks mediation | Split gateway, attested builds |
| False conclusions | Versioned datasets, reproducible configs, evidence provenance | Judge error, incomplete coverage, stochastic outputs | Broader suites, repeated runs |

## Open gaps in this build

- Compose isolation is implemented but was not exercised on this workstation because Docker is unavailable here. The local stack exercises policy, ledger, PCF, suite and UI only.
- The K8s manifests from the earlier plan are not part of this build; Compose is the deployment artifact.
- The default `mock` model makes the demo deterministic. A real Ollama model introduces latency variance and stochastic outputs; the PCF records the adapter and response hash, but reproducibility is weaker.
- The witness and anchor are co-located on one host in this demo. A real deployment should put the witness on a second host and the anchor in a public transparency log.
- The seccomp profile is an explicit deny-list, not a default-deny allowlist. It is a hardening layer, not a proof.

## Non-claims

- No protection from a container escape through a host kernel exploit.
- No protection from hardware side channels (cache, Spectre class).
- No protection from a compromised host administrator acting before events are signed.
- No GPU memory claim on this CPU-only build.
- A pass means the tested control held on the tested path, not that the arena is secure.
