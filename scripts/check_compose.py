from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
COMPOSE = ROOT / "compose.yaml"
SECCOMP = ROOT / "security" / "seccomp.json"
POLICY = ROOT / "security" / "policies" / "policy.json"

TENANT_SERVICES = ("model", "blue", "red")
INTERNAL_NETWORKS = ("evidence", "rednet", "bluenet", "modelnet")
KEY_VOLUMES = ("signer-keys", "witness-keys", "control-keys")


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    compose = yaml.safe_load(COMPOSE.read_text(encoding="utf-8"))
    services = compose["services"]
    networks = compose["networks"]

    for network in INTERNAL_NETWORKS:
        if not (networks.get(network) or {}).get("internal"):
            fail(f"network {network} must be internal", errors)

    exposed = []
    for name, service in services.items():
        for port in service.get("ports", []) or []:
            exposed.append(f"{name}:{port}")
    if exposed != ["web:8080:8080"]:
        fail(f"only the web edge should publish a port; got {exposed}", errors)

    for name in TENANT_SERVICES:
        service = services.get(name, {})
        if service.get("read_only") is not True:
            fail(f"{name} must be read-only", errors)
        if service.get("cap_drop") != ["ALL"]:
            fail(f"{name} must drop all capabilities", errors)
        if "no-new-privileges:true" not in (service.get("security_opt") or []):
            fail(f"{name} must set no-new-privileges", errors)
        if "seccomp=./security/seccomp.json" not in (service.get("security_opt") or []):
            fail(f"{name} must use the seccomp profile", errors)
        if not service.get("pids_limit"):
            fail(f"{name} must set a pids limit", errors)
        if not service.get("mem_limit"):
            fail(f"{name} must set a memory limit", errors)

    gateway = services.get("gateway", {})
    if "edge" not in (gateway.get("networks") or []):
        fail("gateway must attach to the edge network", errors)
    for network in INTERNAL_NETWORKS:
        if network not in (gateway.get("networks") or []):
            fail(f"gateway must attach to {network}", errors)

    env = gateway.get("environment") or {}
    required_markers = {
        "BASTION_ENV": "${BASTION_ENV:?",
        "BASTION_ADMIN_TOKEN": "${BASTION_ADMIN_TOKEN:?",
        "BASTION_INTERNAL_TOKEN": "${BASTION_INTERNAL_TOKEN:?",
    }
    for name, marker in required_markers.items():
        value = str(env.get(name, ""))
        if not value.startswith(marker):
            fail(f"{name} must be an explicit required Compose variable", errors)
        if name in {"BASTION_ADMIN_TOKEN", "BASTION_INTERNAL_TOKEN"} and "dev-" in value:
            fail(f"{name} must not default to a demo credential", errors)
    for flag in ("BASTION_ALLOW_KEY_GEN", "BASTION_ALLOW_NAIVE", "BASTION_ALLOW_TAMPER", "BASTION_ALLOW_JUDGE"):
        if str(env.get(flag, "")) != f"${{{flag}:-0}}":
            fail(f"{flag} must default to 0 in Compose", errors)
    if env.get("BASTION_CORS_ORIGINS") not in (None, "${BASTION_CORS_ORIGINS:-}"):
        fail("BASTION_CORS_ORIGINS should default to empty (same-origin web)", errors)

    def volumes_of(name: str) -> list[str]:
        return [str(item) for item in (services[name].get("volumes") or [])]

    if "signer-keys:/keys" not in volumes_of("signer"):
        fail("signer must mount only signer-keys at /keys", errors)
    if any(volume.startswith(("witness-keys", "control-keys")) for volume in volumes_of("signer")):
        fail("signer must not mount witness or control private keys", errors)
    if "witness-keys:/keys" not in volumes_of("witness"):
        fail("witness must mount only witness-keys at /keys", errors)
    if any(volume.startswith(("signer-keys", "control-keys")) for volume in volumes_of("witness")):
        fail("witness must not mount signer or control private keys", errors)
    if "control-keys:/keys" not in volumes_of("gateway"):
        fail("gateway must mount only control-keys at /keys", errors)
    if any(volume.startswith(("signer-keys", "witness-keys")) for volume in volumes_of("gateway")):
        fail("gateway must not mount signer or witness private keys", errors)
    for name in TENANT_SERVICES:
        if volumes_of(name):
            fail(f"{name} must not mount host/service volumes", errors)
    for volume in KEY_VOLUMES:
        if f"{volume}:" not in " ".join(volumes_of("init")):
            fail(f"init must provision the {volume} volume", errors)

    if "rednet" not in (services["red"].get("networks") or []):
        fail("red must only reach the gateway through rednet", errors)
    if "bluenet" in (services["red"].get("networks") or []):
        fail("red must not join the Blue network", errors)
    if "bluenet" in (services["model"].get("networks") or []):
        fail("model must not join the Blue network", errors)
    if "modelnet" in (services["blue"].get("networks") or []):
        fail("blue must not join the model network", errors)
    if "rednet" in (services["blue"].get("networks") or []):
        fail("blue must not join the Red network", errors)

    raw_compose = COMPOSE.read_text(encoding="utf-8")
    for demo_credential in ("dev-admin-token", "dev-internal-token"):
        if demo_credential in raw_compose:
            fail(f"compose.yaml must not contain the demo credential {demo_credential}", errors)

    if not SECCOMP.exists():
        fail("security/seccomp.json is missing", errors)
    else:
        profile = json.loads(SECCOMP.read_text(encoding="utf-8"))
        if profile.get("defaultAction") != "SCMP_ACT_ALLOW":
            fail("seccomp profile should be an explicit deny-list", errors)

    if not POLICY.exists():
        fail("security/policies/policy.json is missing", errors)

    if errors:
        print("Compose checks failed:")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(
        "Compose checks passed: internal tenant networks, minimal exposure, read-only tenants, "
        "caps dropped, seccomp wired, credentials required, signing keys separated."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
