from __future__ import annotations

from .canonical import sha256_bytes


def _leaf(value: str) -> bytes:
    return sha256_bytes(b"\x00" + bytes.fromhex(value))


def _node(left: bytes, right: bytes) -> bytes:
    return sha256_bytes(b"\x01" + left + right)


def merkle_root(hex_leaves: list[str]) -> str:
    if not hex_leaves:
        return sha256_bytes(b"bastionloop:empty-merkle").hex()
    level = [_leaf(h) for h in hex_leaves]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        level = [_node(level[i], level[i + 1]) for i in range(0, len(level), 2)]
    return level[0].hex()


def merkle_proof(hex_leaves: list[str], index: int) -> list[dict[str, str]]:
    if not 0 <= index < len(hex_leaves):
        raise IndexError("leaf index out of range")
    level = [_leaf(h) for h in hex_leaves]
    idx = index
    proof: list[dict[str, str]] = []
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        sibling = idx ^ 1
        proof.append({"side": "left" if sibling < idx else "right", "hash": level[sibling].hex()})
        level = [_node(level[i], level[i + 1]) for i in range(0, len(level), 2)]
        idx //= 2
    return proof
