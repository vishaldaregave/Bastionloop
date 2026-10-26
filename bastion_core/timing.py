from __future__ import annotations

import math
import time
from typing import Iterable


def percentile(samples: Iterable[float], pct: float) -> float:
    values = sorted(samples)
    if not values:
        return 0.0
    if len(values) == 1:
        return float(values[0])
    rank = (len(values) - 1) * (pct / 100.0)
    lo = math.floor(rank)
    hi = math.ceil(rank)
    if lo == hi:
        return float(values[lo])
    return float(values[lo] + (values[hi] - values[lo]) * (rank - lo))


def summarize(samples: Iterable[float]) -> dict[str, float | int]:
    values = [float(v) for v in samples]
    if not values:
        return {"n": 0, "p50": 0.0, "p95": 0.0, "mean": 0.0, "min": 0.0, "max": 0.0}
    return {
        "n": len(values),
        "p50": round(percentile(values, 50), 3),
        "p95": round(percentile(values, 95), 3),
        "mean": round(sum(values) / len(values), 3),
        "min": round(min(values), 3),
        "max": round(max(values), 3),
    }


def padded_latency(started: float, bucket_ms: int) -> float:
    """Sleep until the response lands on a fixed latency bucket, then return latency."""
    if bucket_ms <= 0:
        return (time.perf_counter() - started) * 1000.0
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    bucket = max(1, bucket_ms)
    target = math.ceil(max(elapsed_ms, 1.0) / bucket) * bucket
    remaining = (target - elapsed_ms) / 1000.0
    if remaining > 0:
        time.sleep(remaining)
    return (time.perf_counter() - started) * 1000.0


def _ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def mann_whitney_u(sample_a: Iterable[float], sample_b: Iterable[float]) -> dict[str, float | int]:
    """Two-sided Mann-Whitney U with tie-corrected normal approximation."""
    a = [float(v) for v in sample_a]
    b = [float(v) for v in sample_b]
    n1, n2 = len(a), len(b)
    if n1 == 0 or n2 == 0:
        return {"n1": n1, "n2": n2, "u": 0.0, "p_value": 1.0, "auc": 0.5, "z": 0.0, "leakage": 0.0}
    combined = a + b
    ranks = _ranks(combined)
    r1 = sum(ranks[:n1])
    u1 = r1 - n1 * (n1 + 1) / 2.0
    u2 = n1 * n2 - u1
    u = max(u1, u2)
    mu = n1 * n2 / 2.0
    # tie correction
    counts: dict[float, int] = {}
    for v in combined:
        counts[v] = counts.get(v, 0) + 1
    tie_term = sum(t**3 - t for t in counts.values())
    n = n1 + n2
    sigma_sq = (n1 * n2 / 12.0) * ((n + 1) - tie_term / (n * (n - 1))) if n > 1 else 0.0
    if sigma_sq <= 0:
        z = 0.0
        p = 1.0
    else:
        z = (u - mu) / math.sqrt(sigma_sq)
        p = 2.0 * (1.0 - 0.5 * (1.0 + math.erf(abs(z) / math.sqrt(2.0))))
    auc = u1 / (n1 * n2)
    leakage = abs(auc - 0.5) * 2.0
    return {
        "n1": n1,
        "n2": n2,
        "u": round(u, 3),
        "p_value": round(min(max(p, 0.0), 1.0), 6),
        "auc": round(auc, 4),
        "z": round(z, 3),
        "leakage": round(leakage, 4),
    }
