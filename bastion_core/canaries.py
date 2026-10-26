from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from .canonical import hash_object

CHANNELS = ("filesystem", "environment", "network", "logs", "model_context", "egress")


def new_canary(tenant_id: str, channel: str, run_id: str) -> str:
    return f"BLCANARY-{tenant_id.upper()}-{channel.upper().replace('_', '')}-{run_id[-6:]}-{secrets.token_hex(4)}"


@dataclass
class CanarySet:
    run_id: str
    tenant_id: str
    values: dict[str, str] = field(default_factory=dict)

    @classmethod
    def plant(cls, run_id: str, tenant_id: str) -> "CanarySet":
        return cls(run_id, tenant_id, {channel: new_canary(tenant_id, channel, run_id) for channel in CHANNELS})

    def all_values(self) -> list[str]:
        return list(self.values.values())

    def write_artifacts(self, root: Path) -> Path:
        run_dir = root / self.run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        for channel, canary in self.values.items():
            (run_dir / f"{channel}.txt").write_text(canary + "\n", encoding="utf-8")
        (run_dir / "manifest.json").write_text(
            __import__("json").dumps(
                {"run_id": self.run_id, "tenant_id": self.tenant_id, "values": self.values}, indent=2
            ),
            encoding="utf-8",
        )
        return run_dir

    def commitment(self) -> str:
        return hash_object(self.values)

    def scan(self, payloads: dict[str, str]) -> dict[str, object]:
        """Find a canary from one channel appearing in another channel's payload."""
        leaks = []
        for source_channel, canary in self.values.items():
            for target_channel, text in payloads.items():
                if target_channel == source_channel:
                    continue
                if canary in text:
                    leaks.append(
                        {
                            "canary_commitment": hash_object(canary),
                            "source_channel": source_channel,
                            "leak_channel": target_channel,
                        }
                    )
        return {
            "clean": len(leaks) == 0,
            "leaks": leaks,
            "channels_planted": sorted(self.values),
            "channels_scanned": sorted(payloads),
        }


def scan_for_any_canary(text: str, canaries: Iterable[str]) -> list[str]:
    return [c for c in canaries if c in text]
