from __future__ import annotations

from services.challenge_suite import suite


class FakeContext:
    def __init__(self, append_failure: bool = False):
        self.append_failure = append_failure
        self.events: list[tuple[str, dict]] = []

    def append(self, event_type: str, metadata: dict) -> dict:
        if self.append_failure:
            raise RuntimeError("notary unavailable")
        self.events.append((event_type, metadata))
        return {"event_id": "evt_status_1", "seq": 9, "event_hash": "a" * 64}


def _passing(_ctx):
    return suite._result(
        "T-PASS",
        "A control holds",
        "test",
        "expected",
        "observed",
        "pass",
        limitations="Synthetic test only.",
    )


def test_success_is_uppercase_pass_with_evidence_reference():
    ctx = FakeContext()
    result = suite.execute_test(ctx, "T-PASS", "A control holds", "test", _passing)
    assert result.status == "PASS"
    assert result.evidence_id == "ledger:evt_status_1"
    assert result.evidence_seq == 9
    assert result.evidence_hash == "a" * 64
    assert result.limitations == "Synthetic test only."
    assert ctx.events[0][1]["status"] == "PASS"


def test_exception_is_error_not_pass_or_untested():
    ctx = FakeContext()

    def boom(_ctx):
        raise RuntimeError("service exploded")

    result = suite.execute_test(ctx, "T-ERROR", "Failure case", "test", boom)
    assert result.status == "ERROR"
    assert "RuntimeError" in result.detail
    assert result.status not in {"PASS", "UNTESTED"}


def test_missing_prerequisite_is_untested():
    ctx = FakeContext()

    def unavailable(_ctx):
        raise suite.TestUnavailable("Docker is not available")

    result = suite.execute_test(ctx, "T-SKIP", "Needs Docker", "test", unavailable)
    assert result.status == "UNTESTED"
    assert "Docker" in result.detail


def test_unrecordable_result_is_error():
    ctx = FakeContext(append_failure=True)
    result = suite.execute_test(ctx, "T-EVIDENCE", "Evidence write", "test", _passing)
    assert result.status == "ERROR"
    assert result.evidence_id is None
    assert "append failed" in result.detail


def test_invalid_status_is_converted_to_error_not_pass():
    payload = suite._result("T-INVALID", "Invalid", "test", "x", "y", "recorded")
    result = suite.TestResult(**payload)
    assert result.status == "ERROR"


def test_every_result_has_limitations_field():
    result = suite._result("T-LIMIT", "Limits", "test", "x", "y", "fail")
    assert result["limitations"]


def test_status_constants_are_distinct():
    assert suite.STATUSES == {"PASS", "FAIL", "ERROR", "UNTESTED"}
    assert len(suite.STATUSES) == 4
