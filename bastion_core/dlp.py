from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from typing import Iterable

from .canonical import sha256_hex

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("openai-key", re.compile(r"sk-[A-Za-z0-9_\-]{16,}")),
    ("aws-access-key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("github-token", re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}")),
    ("slack-token", re.compile(r"xox[baprs]-[A-Za-z0-9\-]{10,}")),
    ("private-key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
    ("synthetic-secret", re.compile(r"SYNTHSECRET-[A-Za-z0-9\-]+")),
    ("generic-secret", re.compile(r"(?i)(?:api[_-]?key|secret|password|passwd)\s*[:=]\s*[^\s\"']{8,}")),
]

SPACED_CANARY = re.compile(r"\b(?:[A-Za-z0-9]\s+){8,}[A-Za-z0-9]\b")


@dataclass(frozen=True)
class DlpFinding:
    kind: str
    label: str
    offset: int
    match_hash: str

    def as_dict(self) -> dict[str, str | int]:
        return {
            "kind": self.kind,
            "label": self.label,
            "offset": self.offset,
            "match_hash": self.match_hash,
        }


def _encodings(canary: str) -> list[tuple[str, str]]:
    raw = canary.encode("utf-8")
    variants = [
        ("plain", canary),
        ("lower", canary.lower()),
        ("base64", base64.b64encode(raw).decode("ascii")),
        ("base64-nopad", base64.b64encode(raw).decode("ascii").rstrip("=")),
        ("hex", raw.hex()),
        ("spaced", " ".join(canary)),
        ("spaced-hyphenless", " ".join(canary.replace("-", " ").split())),
        ("dehyphenated", canary.replace("-", " ")),
        ("dashed", "-".join(canary)),
    ]
    seen: set[str] = set()
    out = []
    for name, value in variants:
        if value not in seen:
            seen.add(value)
            out.append((name, value))
    return out


def scan_text(text: str, canaries: Iterable[str] = (), secrets: bool = True) -> list[DlpFinding]:
    findings: list[DlpFinding] = []
    if not text:
        return findings
    for canary in canaries:
        for encoding, needle in _encodings(canary):
            idx = text.find(needle)
            if idx >= 0:
                findings.append(
                    DlpFinding(
                        "canary",
                        f"canary:{sha256_hex(canary)[:12]}:{encoding}",
                        idx,
                        sha256_hex(needle),
                    )
                )
                break
    if SPACED_CANARY.search(text):
        spaced = SPACED_CANARY.search(text)
        if spaced and len(spaced.group(0).replace(" ", "")) >= 12:
            findings.append(
                DlpFinding("canary-shape", "spaced-token", spaced.start(), sha256_hex(spaced.group(0)))
            )
    if secrets:
        for label, pattern in SECRET_PATTERNS:
            for match in pattern.finditer(text):
                findings.append(
                    DlpFinding("secret", label, match.start(), sha256_hex(match.group(0)))
                )
    return findings


def scan_payload(payload: dict[str, str], canaries: Iterable[str] = ()) -> dict[str, object]:
    hits: list[dict[str, object]] = []
    for channel, text in payload.items():
        for finding in scan_text(text, canaries):
            hits.append({"channel": channel, **finding.as_dict()})
    return {"clean": len(hits) == 0, "hits": hits, "scanned_channels": sorted(payload)}
