# Policy-as-code

`policy.json` is the source of truth for the built-in policy engine. `authz.rego` is the OPA-compatible equivalent. The gateway seeds a fresh data directory from `policy.json`, signs the bundle with the control key, and logs the bundle hash on every policy decision.

When `opa` is on `PATH` and `BASTION_POLICY_ENGINE=opa`, the gateway evaluates `authz.rego` instead of the built-in matcher. The signature check and bundle hash still apply, so a tampered bundle is refused before evaluation.

Rules are deny-by-default. Tenants can read their own events, findings and runs, infer only inside their own run, and run security tests only if they are the suite. System is the only administrator. The naive baseline does not change authorization; it deliberately changes isolation and model-session behavior, and it is labelled in every report.
