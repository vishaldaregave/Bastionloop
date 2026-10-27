from __future__ import annotations

import httpx

from workers.blue import app as blue_app
from workers.red import app as red_app


class FakeResponse:
    status_code = 200


def test_red_egress_and_metadata_use_controlled_local_targets(monkeypatch):
    calls: list[str] = []

    def fake_get(url: str, timeout: float):
        calls.append(url)
        return FakeResponse()

    monkeypatch.setattr(httpx, "get", fake_get)

    egress = red_app.probe(red_app.ProbeRequest(probe="egress"))
    metadata = red_app.probe(red_app.ProbeRequest(probe="metadata"))

    assert calls[0] == red_app.PROBE_EGRESS_URL
    assert calls[1] == red_app.PROBE_METADATA_URL
    assert all("example.com" not in url and "169.254.169.254" not in url for url in calls)
    assert egress["controlled"] is True
    assert metadata["controlled"] is True


def test_blue_egress_uses_controlled_local_target(monkeypatch):
    calls: list[str] = []

    def fake_get(url: str, timeout: float):
        calls.append(url)
        return FakeResponse()

    monkeypatch.setattr(httpx, "get", fake_get)
    result = blue_app.probe(blue_app.ProbeRequest(probe="egress"))

    assert calls == [blue_app.PROBE_EGRESS_URL]
    assert "example.com" not in calls[0]
    assert "169.254.169.254" not in calls[0]
    assert result["controlled"] is True
