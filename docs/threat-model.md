# Threat model

## Assets

- Red's unreleased payload corpus.
- Blue's rules and weights.
- The model's per-session context and freshness.
- The audit ledger, checkpoint signatures and anchor.
- Capability tokens and signing keys.
- The integrity of the Trust Report and PCFs.

## Adversaries

1. **Tenant attacker (Red):** controls prompts, tries to read Blue, the model, other tenants, a controlled metadata-shaped local endpoint or the host filesystem.
2. **Compromised admin with database access:** tries to edit, delete, reorder or truncate ledger records or rewrite the chain.
3. **Compromised single service:** tries to forge history without the signer or witness.
4. **Network attacker:** tries direct tenant-to-tenant connections, controlled DNS or metadata-shaped local egress. The harness never targets public Internet or real cloud metadata endpoints.
5. **Judge with a shell:** gets a scoped Red token and tries to break the arena; every attempt is recorded.

## Trust assumptions

- The host kernel and container runtime are trusted.
- The gateway image is small and its digest is recorded in every PCF.
- The signer key never enters a tenant container; the verifier holds only public keys.
- The witness and anchor are outside the arena admin's control.
- Pinned public keys are compared out of band before verification.

## Controls

| Threat | Control | Where |
|---|---|---|
| Cross-tenant file access | Separate volumes, non-root user, read-only tenant containers, no tenant volume mounts | Compose, K8s artifacts |
| Direct Red → Blue / model | Internal tenant networks, gateway-only bridge, no published tenant ports | `compose.yaml` |
| Metadata / external egress | Internal networks, no default route, red probe tests | Compose, NET tests |
| Privileged operations | `cap_drop: ALL`, `no-new-privileges`, seccomp deny-list, pids/memory/CPU caps | Compose |
| Unauthorized API access | Short-lived Ed25519 capability tokens, run scoping, deny-by-default policy, policy bundle hash on every decision | Gateway |
| Direct internal service access | Internal credential required on signer, witness, anchor writes, notary reads/writes, model, Blue, Red probes and suite reports; network reachability is never the only check | All services |
| Private-key theft by another service | Separate signer, witness and control key volumes; tenant containers mount no keys; pinned public keys are read-only for notary/suite | Compose |
| Blue logic leakage | Sealed Blue, verdicts only, rules visible only in naive mode | Blue, gateway |
| Red payload leakage | Commit-reveal, payload stored privately, ledger holds hashes only | Gateway/notary |
| Cross-session model leakage | One model session per test, canary freshness probe, session ID in PCF | Model worker |
| Egress leakage | DLP for canaries, base64/hex/spaced encodings and secret patterns | Gateway |
| Timing oracle | Fixed-latency verdict buckets, Mann-Whitney U on allow/block samples | Gateway/suite |
| Ledger edit/delete/reorder | Hash chain, append-only triggers, Merkle checkpoints | Notary |
| Tail truncation / re-chain | Signed checkpoints, witness co-signature, external anchor chain | Signer/witness/anchor |
| Fabricated dashboard numbers | Evidence-bound UI: numbers require an evidence ID and verifier status, otherwise UNTESTED/UNVERIFIED | Web |
| Fake demo telemetry | No synthetic stream; every event originates from an executed test | Gateway |
| Accidental production demo mode | `BASTION_ENV=production` rejects demo credentials, local runtime, key generation, naive mode, tamper and judge endpoints; Compose requires explicit credentials and image digest | Configuration, Compose |

## Failure conditions

Guarantees fail if:

- the host kernel is compromised;
- the signer or witness key is stolen;
- the gateway image is modified without updating its digest;
- the policy bundle no longer matches the logged hash;
- the pinned public keys are replaced out of band;
- `BASTION_INTERNAL_TOKEN` or `BASTION_ADMIN_TOKEN` is stolen;
- a production deployment is started with development flags, demo credentials or `BASTION_RUNTIME=local` (the configuration layer refuses these).

## Explicit non-claims

- No protection from a container escape through a host kernel exploit.
- No protection from hardware side channels (cache, Spectre class).
- No protection from a compromised host administrator acting before signing.
- No GPU memory claim on this CPU-only build.
- A pass means the tested control held on the tested path, not that the arena is secure.

## Honest reporting rule

Infrastructure isolation failures are separated from model safety failures. A model can fail a jailbreak test while the arena stays isolated, and the reverse. The Trust Report labels both and lists untested controls.
