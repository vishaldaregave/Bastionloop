from __future__ import annotations

import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.exceptions import InvalidSignature

from .canonical import b64d, b64e, sha256_hex

KEY_NAMES = ("signer", "witness", "control")


class KeyError_(RuntimeError):
    pass


def generate_private_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def private_to_pem(key: Ed25519PrivateKey) -> bytes:
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def public_to_pem(key: Ed25519PublicKey) -> bytes:
    return key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def save_private_key(key: Ed25519PrivateKey, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(private_to_pem(key))
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def save_public_key(key: Ed25519PublicKey, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(public_to_pem(key))


def load_private_key(path: Path) -> Ed25519PrivateKey:
    if not path.exists():
        raise KeyError_(f"private key not found: {path}")
    key = serialization.load_pem_private_key(path.read_bytes(), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise KeyError_(f"not an Ed25519 key: {path}")
    return key


def load_public_key(path: Path) -> Ed25519PublicKey:
    if not path.exists():
        raise KeyError_(f"public key not found: {path}")
    key = serialization.load_pem_public_key(path.read_bytes())
    if not isinstance(key, Ed25519PublicKey):
        raise KeyError_(f"not an Ed25519 public key: {path}")
    return key


def key_id(public_key: Ed25519PublicKey) -> str:
    der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return sha256_hex(der)[:16]


def sign_bytes(key: Ed25519PrivateKey, data: bytes) -> str:
    return b64e(key.sign(data))


def verify_bytes(public_key: Ed25519PublicKey, data: bytes, signature: str) -> bool:
    try:
        public_key.verify(b64d(signature), data)
        return True
    except (InvalidSignature, ValueError):
        return False


def ensure_keypair(name: str, keys_dir: Path, pinned_dir: Path, force: bool = False) -> str:
    priv_path = keys_dir / f"{name}.pem"
    pub_path = pinned_dir / f"{name}.pub"
    if force or not priv_path.exists():
        key = generate_private_key()
        save_private_key(key, priv_path)
        save_public_key(key.public_key(), pub_path)
    else:
        key = load_private_key(priv_path)
        if not pub_path.exists():
            save_public_key(key.public_key(), pub_path)
    return key_id(key.public_key())


def ensure_keys(keys_dir: Path, pinned_dir: Path, force: bool = False) -> dict[str, str]:
    """Create missing keypairs and pinned public keys. Returns key ids."""
    return {name: ensure_keypair(name, keys_dir, pinned_dir, force) for name in KEY_NAMES}


def pinned_key(pinned_dir: Path, name: str) -> Ed25519PublicKey:
    return load_public_key(pinned_dir / f"{name}.pub")


def pinned_key_id(pinned_dir: Path, name: str) -> str:
    return key_id(pinned_key(pinned_dir, name))
