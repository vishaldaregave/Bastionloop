from __future__ import annotations

import time

from bastion_core.timing import mann_whitney_u, padded_latency, summarize


def test_padding_lands_on_a_bucket():
    started = time.perf_counter()
    latency = padded_latency(started, 30)
    assert latency >= 25.0
    assert latency < 200.0


def test_mann_whitney_detects_a_separated_distribution():
    allow = [10, 11, 12, 13, 14, 15]
    block = [110, 111, 112, 113, 114, 115]
    result = mann_whitney_u(allow, block)
    assert result["p_value"] < 0.05
    assert result["leakage"] > 0.9


def test_mann_whitney_is_flat_for_identical_samples():
    result = mann_whitney_u([100, 100, 100, 100, 100], [100, 100, 100, 100, 100])
    assert result["p_value"] == 1.0
    assert result["leakage"] == 0.0


def test_summary_percentiles():
    stats = summarize([1, 2, 3, 4, 5])
    assert stats["n"] == 5
    assert stats["p50"] == 3.0
    assert stats["p95"] >= 4.5
