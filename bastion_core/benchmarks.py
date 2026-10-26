from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .canonical import hash_object


@dataclass(frozen=True)
class Benchmark:
    benchmark_id: str
    version: str
    source: str
    cases: tuple[dict[str, Any], ...]
    path: Path

    @property
    def digest(self) -> str:
        return hash_object({"id": self.benchmark_id, "version": self.version, "cases": list(self.cases)})

    @property
    def case_count(self) -> int:
        return len(self.cases)


def benchmarks_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "benchmarks"


def load_benchmark(benchmark_id: str) -> Benchmark:
    safe = benchmark_id.replace("..", "").replace("/", "").replace("\\", "")
    path = benchmarks_dir() / f"{safe}.json"
    if not path.exists() and not safe.endswith(".json"):
        path = benchmarks_dir() / f"{safe}.json"
    if not path.exists():
        raise FileNotFoundError(f"benchmark not found: {benchmark_id}")
    document = json.loads(path.read_text(encoding="utf-8"))
    return Benchmark(
        benchmark_id=document["benchmark_id"],
        version=document["version"],
        source=document["source"],
        cases=tuple(document["cases"]),
        path=path,
    )


def list_benchmarks() -> list[dict[str, Any]]:
    out = []
    for path in sorted(benchmarks_dir().glob("*.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            continue
        out.append(
            {
                "benchmark_id": document["benchmark_id"],
                "version": document["version"],
                "source": document["source"],
                "cases": len(document["cases"]),
                "digest": hash_object(document),
            }
        )
    return out
