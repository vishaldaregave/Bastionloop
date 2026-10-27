from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

SERVICES = [
    ("signer", "services.signer.app:app", 8002),
    ("witness", "services.witness.app:app", 8003),
    ("anchor", "services.anchor.app:app", 8004),
    ("notary", "services.notary.app:app", 8001),
    ("model", "workers.model.app:app", 8005),
    ("blue", "workers.blue.app:app", 8006),
    ("red", "workers.red.app:app", 8010),
    ("gateway", "services.gateway.app:app", 8000),
    ("suite", "services.challenge_suite.app:app", 8007),
]

URLS = {
    "gateway": "http://127.0.0.1:8000",
    "notary": "http://127.0.0.1:8001",
    "signer": "http://127.0.0.1:8002",
    "witness": "http://127.0.0.1:8003",
    "anchor": "http://127.0.0.1:8004",
    "model": "http://127.0.0.1:8005",
    "blue": "http://127.0.0.1:8006",
    "suite": "http://127.0.0.1:8007",
    "red": "http://127.0.0.1:8010",
}


def _env() -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("BASTION_ENV", "development")
    env.setdefault("BASTION_RUNTIME", "local")
    env.setdefault("BASTION_MODEL_ADAPTER", "mock")
    env.setdefault("BASTION_CHECKPOINT_EVERY", "4")
    env.setdefault("BASTION_PADDING_MS", "120")
    # These are explicit development-only switches. Do not copy them into production.
    env.setdefault("BASTION_ALLOW_KEY_GEN", "1")
    env.setdefault("BASTION_ALLOW_NAIVE", "1")
    env.setdefault("BASTION_ALLOW_TAMPER", "1")
    env.setdefault("BASTION_ALLOW_JUDGE", "1")
    env.setdefault("BASTION_ADMIN_TOKEN", "dev-admin-token")
    env.setdefault("BASTION_INTERNAL_TOKEN", "dev-internal-token")
    for name, url in URLS.items():
        env.setdefault(f"BASTION_{name.upper()}_URL", url)
    env["PYTHONPATH"] = str(ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    return env


def _wait_health(url: str, name: str, attempts: int = 120) -> bool:
    for _ in range(attempts):
        try:
            response = httpx.get(url + "/v1/health", timeout=3.0)
            if response.status_code < 500:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(0.25)
    print(f"[dev] {name} did not become healthy", file=sys.stderr)
    return False


def start_services(clean: bool = False, include_web: bool = True) -> list[subprocess.Popen[bytes]]:
    env = _env()
    data_dir = Path(env.get("BASTION_DATA_DIR", ROOT / "var"))
    logs = data_dir / "logs"
    if clean and data_dir.exists():
        shutil.rmtree(data_dir, ignore_errors=True)
    logs.mkdir(parents=True, exist_ok=True)
    processes: list[subprocess.Popen[bytes]] = []
    print("[dev] starting BastionLoop services")
    for name, module, port in SERVICES:
        log_path = logs / f"{name}.log"
        handle = log_path.open("ab")
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", module, "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning"],
            cwd=str(ROOT),
            env=env,
            stdout=handle,
            stderr=subprocess.STDOUT,
        )
        processes.append(process)
        if not _wait_health(URLS[name], name):
            _stop(processes)
            raise SystemExit(f"failed to start {name}; see {log_path}")
        print(f"  {name:8} http://127.0.0.1:{port}  (log: var/logs/{name}.log)")

    if include_web:
        web_dir = ROOT / "apps" / "web"
        if (web_dir / "node_modules").exists():
            web_log = logs / "web.log"
            handle = web_log.open("ab")
            npm_bin = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
            web_proc = subprocess.Popen(
                [npm_bin, "run", "dev"],
                cwd=str(web_dir),
                stdout=handle,
                stderr=subprocess.STDOUT,
            )
            processes.append(web_proc)
            print("  web      http://127.0.0.1:5173  (log: var/logs/web.log)")

    (logs / "pids.json").write_text(
        json.dumps(
            [
                {"name": getattr(p, "_name", f"proc-{i}"), "pid": p.pid}
                for i, p in enumerate(processes)
            ],
            indent=2,
        ),
        encoding="utf-8",
    )
    return processes


def _stop(processes: list[subprocess.Popen[bytes]]) -> None:
    for process in processes:
        if process.poll() is None:
            if sys.platform == "win32":
                try:
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)
                except Exception:
                    process.terminate()
            else:
                process.terminate()
    deadline = time.time() + 8
    for process in processes:
        remaining = max(0.1, deadline - time.time())
        try:
            process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            process.kill()


def run_demo() -> int:
    from bastion_cli.main import main as cli_main

    code = cli_main(["demo", "--suite", "--write-pcf"])
    if code != 0:
        return code
    return cli_main(["report"])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bastion-dev", description="Run the BastionLoop stack locally")
    parser.add_argument("--demo", action="store_true", help="run the end-to-end demo after startup")
    parser.add_argument("--clean", action="store_true", help="delete var/ before starting")
    parser.add_argument("--once", action="store_true", help="run demo and exit")
    parser.add_argument("--no-block", action="store_true", help="start services and exit")
    parser.add_argument("--no-web", action="store_true", help="skip launching frontend dev server")
    args = parser.parse_args(argv)

    processes = start_services(clean=args.clean, include_web=not args.no_web and not (args.demo or args.once))
    code = 0
    keep_running = False
    try:
        if args.demo or args.once:
            code = run_demo()
        if args.once:
            return code
        if args.no_block:
            keep_running = True
            print("[dev] services left running. Stop them with the PIDs above or kill the python processes.")
            return code
        print("[dev] ready. Press Ctrl+C to stop.")
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        print("[dev] a service exited; shutting down", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n[dev] stopping")
        return code
    finally:
        if not keep_running:
            _stop(processes)


if __name__ == "__main__":
    raise SystemExit(main())
