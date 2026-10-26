from __future__ import annotations

import json
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization

from bastion_core.canonical import b64e
from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import key_id, load_public_key


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    output = Path(args[0]) if args else None
    s = ensure_dirs(settings())
    keys = {}
    for name in ("signer", "witness", "control"):
        public_key = load_public_key(s.pinned_dir / f"{name}.pub")
        keys[name] = {
            "key_id": key_id(public_key),
            "public_key_b64": b64e(
                public_key.public_bytes(
                    encoding=serialization.Encoding.Raw,
                    format=serialization.PublicFormat.Raw,
                )
            ),
            "pem": public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            ).decode("ascii"),
        }
    document = {"keys": keys, "note": "Public keys only. Compare fingerprints out of band."}
    text = json.dumps(document, indent=2)
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text + "\n", encoding="utf-8")
        print(output)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
