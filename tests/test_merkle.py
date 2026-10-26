from __future__ import annotations

from bastion_core.merkle import merkle_proof, merkle_root


def test_merkle_root_is_deterministic_and_changes_on_edit():
    leaves = [f"{index:064x}" for index in range(5)]
    assert merkle_root(leaves) == merkle_root(list(leaves))
    edited = list(leaves)
    edited[2] = "f" * 64
    assert merkle_root(leaves) != merkle_root(edited)


def test_merkle_proof_shapes():
    leaves = [f"{index:064x}" for index in range(4)]
    proof = merkle_proof(leaves, 2)
    assert len(proof) == 2
    assert all(item["side"] in {"left", "right"} for item in proof)
