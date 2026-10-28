from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    data_dir = Path(os.environ.get("BASTION_DATA_DIR", ROOT / "var"))
    path = data_dir / "logs" / "pids.json"
    if not path.exists():
        print(f"no pid file at {path}")
        return 0
    entries = json.loads(path.read_text(encoding="utf-8"))
    for entry in entries:
        pid = int(entry["pid"])
        name = entry.get("name", "proc")
        if sys.platform == "win32":
            res = subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, text=True)
            if res.returncode == 0:
                print(f"stopped {name} (pid {pid})")
            else:
                print(f"{name} (pid {pid}) was not running")
        else:
            try:
                os.kill(pid, signal.SIGTERM)
                print(f"stopped {name} (pid {pid})")
            except OSError:
                print(f"{name} (pid {pid}) was not running")
    if sys.platform != "win32":
        time.sleep(1)
        for entry in entries:
            pid = int(entry["pid"])
            try:
                os.kill(pid, 0)
            except OSError:
                continue
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
    path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
