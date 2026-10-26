from __future__ import annotations

from pathlib import Path

import pytest

from bastion_core.crypto import ensure_keys, load_private_key, load_public_key


@pytest.fixture()
def keys(tmp_path: Path):
    keys_dir = tmp_path / "keys"
    pinned_dir = tmp_path / "pinned"
    ids = ensure_keys(keys_dir, pinned_dir)
    return {
        "dir": keys_dir,
        "pinned": pinned_dir,
        "ids": ids,
        "signer": load_private_key(keys_dir / "signer.pem"),
        "witness": load_private_key(keys_dir / "witness.pem"),
        "control": load_private_key(keys_dir / "control.pem"),
        "signer_pub": load_public_key(pinned_dir / "signer.pub"),
        "witness_pub": load_public_key(pinned_dir / "witness.pub"),
        "control_pub": load_public_key(pinned_dir / "control.pub"),
    }
