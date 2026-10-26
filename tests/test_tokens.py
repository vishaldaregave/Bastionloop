from __future__ import annotations

import pytest

from bastion_core.tokens import TokenError, issue_token, verify_token


def test_issue_and_verify_scope(keys):
    token = issue_token(keys["control"], "red", ["infer", "events:read"], run_id="run_1", ttl_seconds=60)
    cap = verify_token(token, keys["control_pub"], action="infer", run_id="run_1")
    assert cap.tenant_id == "red"
    assert cap.run_id == "run_1"
    assert cap.allows("events:read")
    with pytest.raises(TokenError):
        verify_token(token, keys["control_pub"], action="admin:mode")
    with pytest.raises(TokenError):
        verify_token(token, keys["control_pub"], action="infer", run_id="run_2")


def test_expiry_is_enforced(keys):
    token = issue_token(keys["control"], "red", ["infer"], ttl_seconds=10, now=1000.0)
    assert verify_token(token, keys["control_pub"], now=1005.0).tenant_id == "red"
    with pytest.raises(TokenError, match="expired"):
        verify_token(token, keys["control_pub"], now=1011.0)


def test_signature_is_bound_to_the_pinned_key(keys):
    other = issue_token(keys["control"], "blue", ["events:read"])
    with pytest.raises(TokenError):
        verify_token(other, keys["signer_pub"])
