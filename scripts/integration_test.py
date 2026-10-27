from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bastion_core.http import ServiceError, get_json, post_json  # noqa: E402
from scripts import dev  # noqa: E402


def _headers(env: dict[str, str]) -> dict[str, str]:
    return {"X-Bastion-Internal": env["BASTION_INTERNAL_TOKEN"]}


def _print_suite(document: dict[str, Any]) -> None:
    summary = document.get("summary", {})
    print(
        "[integration] suite "
        f"PASS={summary.get('pass', 0)} FAIL={summary.get('fail', 0)} "
        f"ERROR={summary.get('error', 0)} UNTESTED={summary.get('untested', 0)} "
        f"TOTAL={summary.get('total', 0)} model={document.get('model_adapter')}"
    )
    for result in document.get("results", []):
        print(
            f"  [{result.get('status'):8}] {result.get('test_id'):7} "
            f"{result.get('name')} | evidence={result.get('evidence_id')}"
        )
        if result.get("status") in {"FAIL", "ERROR"}:
            print(f"           actual={result.get('actual')} detail={result.get('detail')}")


def _run_suite(args: argparse.Namespace, env: dict[str, str]) -> dict[str, Any]:
    return post_json(
        dev.URLS["suite"] + "/v1/security-tests",
        {"tests": args.tests, "mode": args.mode},
        "suite",
        timeout=600.0,
        headers=_headers(env),
    )


def _stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def _faults(processes: list[subprocess.Popen[bytes]], env: dict[str, str]) -> bool:
    by_name = {name: process for (name, _, _), process in zip(dev.SERVICES, processes)}
    notary = dev.URLS["notary"]
    headers = _headers(env)
    observed: dict[str, Any] = {}

    post_json(
        notary + "/v1/ledger/append",
        {"event_type": "integration.fault", "metadata": {"test": "witness-down"}, "tenant_id": "suite"},
        "notary",
        timeout=20.0,
        headers=headers,
    )
    _stop_process(by_name["witness"])
    try:
        post_json(notary + "/v1/checkpoints/create", {}, "notary", timeout=20.0, headers=headers)
        observed["witness_down"] = {"passed": False, "actual": "checkpoint unexpectedly succeeded"}
    except ServiceError as exc:
        observed["witness_down"] = {
            "passed": exc.status in {502, 503},
            "actual": f"HTTP {exc.status}: {exc}",
        }

    _stop_process(by_name["anchor"])
    verify = get_json(notary + "/v1/ledger/verify", "notary", timeout=20.0, headers=headers)
    codes = {issue.get("code") for issue in verify.get("issues", [])}
    observed["anchor_down"] = {
        "passed": verify.get("status") == "FAILED"
        and bool(codes & {"anchor-unavailable", "anchor-missing", "anchor-entry-missing"}),
        "actual": f"status={verify.get('status')} codes={sorted(codes)}",
    }

    print("[integration] live fault injection")
    for name, result in observed.items():
        print(f"  [{'PASS' if result['passed'] else 'FAIL'}] {name}: {result['actual']}")
    return all(result["passed"] for result in observed.values())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the BastionLoop challenge suite against a disposable local stack"
    )
    parser.add_argument("--clean", action="store_true", help="delete var/ before starting")
    parser.add_argument("--faults", action="store_true", help="stop witness and anchor after the suite and assert failure behavior")
    parser.add_argument("--tests", nargs="*", default=None, help="subset of test IDs")
    parser.add_argument("--mode", default=None, help="suite mode label")
    parser.add_argument("--json", action="store_true", help="print the full suite document")
    parser.add_argument(
        "--allow-model-failures",
        action="store_true",
        help="allow model-safety FAIL results to exit zero; ERROR and infrastructure FAIL still exit nonzero",
    )
    args = parser.parse_args(argv)

    env = dev._env()
    processes: list[subprocess.Popen[bytes]] = []
    try:
        processes = dev.start_services(clean=args.clean)
        document = _run_suite(args, env)
        if args.json:
            print(json.dumps(document, indent=2))
        else:
            _print_suite(document)
        summary = document.get("summary", {})
        failures = [r for r in document.get("results", []) if r.get("status") == "FAIL"]
        model_failures = [r for r in failures if r.get("category") == "llm"]
        allowed_model_failures = args.allow_model_failures and len(model_failures) == len(failures)
        suite_ok = summary.get("error", 0) == 0 and (
            summary.get("fail", 0) == 0 or allowed_model_failures
        )
        if allowed_model_failures and model_failures:
            print(
                "[integration] model-safety FAILs are reported but allowed by "
                "--allow-model-failures: " + ", ".join(r["test_id"] for r in model_failures)
            )
        faults_ok = True
        if args.faults:
            faults_ok = _faults(processes, env)
        return 0 if suite_ok and faults_ok else 1
    except ServiceError as exc:
        print(f"[integration] service error: {exc}", file=sys.stderr)
        return 2
    finally:
        dev._stop(processes)


if __name__ == "__main__":
    raise SystemExit(main())
