from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import ensure_keys
from bastion_core.http import ServiceError, get_json, post_json
from bastion_core.verify import verify_file


def _s():
    return ensure_dirs(settings())


def _admin() -> dict[str, str]:
    return {"Authorization": f"Bearer {_s().admin_token}"}


def _gw(path: str, payload: dict[str, Any] | None = None, timeout: float = 300.0) -> Any:
    base = _s().service("gateway") + path
    if payload is None:
        return get_json(base, "gateway", timeout=timeout, headers=_admin())
    return post_json(base, payload, "gateway", timeout=timeout, headers=_admin())


def _print_issues(result: dict[str, Any]) -> None:
    for issue in result.get("issues", []):
        if issue.get("severity") == "fatal" or issue.get("code") in {
            "uncheckpointed-tail",
            "anchor-unavailable",
        }:
            print(f"  - {issue.get('severity')}: {issue.get('code')} :: {issue.get('detail')}")


def cmd_keys(args: argparse.Namespace) -> int:
    ids = ensure_keys(_s().keys_dir, _s().pinned_dir, force=args.force)
    print(json.dumps({"keys": ids, "keys_dir": str(_s().keys_dir), "pinned_dir": str(_s().pinned_dir)}, indent=2))
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    s = _s()
    path = Path(args.file)
    if not path.exists():
        print(f"file not found: {path}", file=sys.stderr)
        return 2
    anchor_entries = None
    if args.anchor:
        try:
            anchor_entries = get_json(args.anchor.rstrip("/") + "/v1/anchor", "anchor", timeout=10.0)["entries"]
        except ServiceError as exc:
            print(f"could not fetch anchor: {exc}", file=sys.stderr)
            return 2
    result = verify_file(path, s.pinned_dir, anchor_entries)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"{result['status']}: {path}")
        if result.get("finding_id"):
            print(f"  finding: {result['finding_id']}")
        if result.get("chain_position") is not None:
            print(f"  chain position: {result['chain_position']}")
        if result.get("ledger"):
            print(
                f"  events: {result['ledger']['counts']['events']}  "
                f"checkpoints: {result['ledger']['counts']['checkpoints']}  "
                f"anchor entries: {result['ledger']['counts']['anchor_entries']}"
            )
        if result.get("first_broken_link"):
            broken = result["first_broken_link"]
            print(f"  first broken link: seq {broken.get('seq')} ({broken.get('reason')})")
        _print_issues(result)
    return 0 if result.get("verified") else 1


def cmd_suite(args: argparse.Namespace) -> int:
    payload = {"tests": args.tests or None, "mode": args.mode}
    document = _gw("/v1/security-tests", payload)
    for result in document.get("results", []):
        print(
            f"[{result['status']:8}] {result['test_id']:7} {result['name']}"
            + (f" :: {result.get('detail')}" if args.verbose and result.get("detail") else "")
        )
    print(json.dumps(document.get("summary", {}), indent=2))
    if args.report:
        _save_report()
    return 0 if document.get("summary", {}).get("fail", 0) == 0 else 1


def _save_report() -> tuple[Path, Path]:
    s = _s()
    document = get_json(s.service("suite") + "/v1/report.json", "suite", timeout=120.0)
    json_path = s.reports_dir / "trust-report.json"
    json_path.write_text(json.dumps(document, indent=2), encoding="utf-8")
    pdf_path = s.reports_dir / "trust-report.pdf"
    try:
        import httpx

        response = httpx.get(s.service("suite") + "/v1/report.pdf", timeout=120.0)
        if response.status_code == 200:
            pdf_path.write_bytes(response.content)
    except Exception:  # noqa: BLE001
        pass
    print(f"report: {json_path}")
    if pdf_path.exists():
        print(f"pdf:    {pdf_path}")
    return json_path, pdf_path


def cmd_report(args: argparse.Namespace) -> int:
    _save_report()
    return 0


def cmd_tamper(args: argparse.Namespace) -> int:
    result = _gw("/v1/admin/tamper", {"mode": args.mode, "seq": args.seq})
    print(f"tamper mode: {result['mode']} (disposable={result['disposable']})")
    print(f"  before: {result['before']['status']}")
    print(f"  after:  {result['after']['status']}")
    if result["after"].get("first_broken_link"):
        print(f"  first broken link: {result['after']['first_broken_link']}")
    print(f"  issues: {[i['code'] for i in result['after'].get('issues', [])]}")
    return 0 if result["after"]["status"] == "FAILED" else 1


def cmd_health(args: argparse.Namespace) -> int:
    print(json.dumps(_gw("/v1/health"), indent=2))
    return 0


def cmd_export_keys(args: argparse.Namespace) -> int:
    from bastion_core.crypto import KeyError_
    from scripts.export_pinned import main as export_main

    try:
        return export_main([args.output] if args.output else [])
    except KeyError_ as exc:
        print(f"{exc}. Set BASTION_DATA_DIR to the arena data directory first.", file=sys.stderr)
        return 2


def cmd_demo(args: argparse.Namespace) -> int:
    s = _s()
    print("BastionLoop demo")
    _gw("/v1/demo/mode", {"mode": args.mode})
    print(f"mode set: {args.mode}")
    run = _gw(
        "/v1/runs",
        {
            "benchmark_id": args.benchmark,
            "mode": args.mode,
            "max_cases": args.cases,
            "tenant_id": "red",
        },
    )
    print(f"run: {run['run_id']} cases={run['case_count']}")
    run = _gw(f"/v1/runs/{run['run_id']}/start?sync=true", {})
    print(f"status: {run['status']} decisions={run['decisions']} findings={len(run['findings'])}")
    print(f"freshness_clean={run['freshness'].get('clean')} canary_clean={run['canary_scan'].get('clean')}")
    verified = 0
    for finding in run.get("findings", []):
        detail = _gw(f"/v1/findings/{finding['finding_id']}")
        status = (detail.get("verification") or {}).get("status")
        print(f"  PCF {finding['finding_id']} {finding['finding_type']} -> {status}")
        if status == "VERIFIED":
            verified += 1
            if args.write_pcf:
                target = s.reports_dir / f"{finding['finding_id']}.json"
                target.write_text(json.dumps(detail["pcf"], indent=2), encoding="utf-8")
                print(f"    exported: {target}")
    integrity = _gw("/v1/ledger/verify")
    print(f"ledger: {integrity['status']}")
    tamper = _gw("/v1/admin/tamper", {"mode": "edit"})
    print(f"tamper simulator: before={tamper['before']['status']} after={tamper['after']['status']}")
    if args.suite:
        document = _gw("/v1/security-tests", {"tests": ["IAM-01", "LLM-01", "LLM-03", "AUD-01", "MON-01"]})
        print("suite:", json.dumps(document.get("summary", {})))
    report = get_json(s.service("suite") + "/v1/report.json", "suite", timeout=120.0)
    print(f"trust report: passed={report['summary']['passed']} failed={report['summary']['failed']} untested={report['summary']['untested']}")
    ok = (
        run["status"] == "complete"
        and verified > 0
        and integrity["status"] == "VERIFIED"
        and tamper["after"]["status"] == "FAILED"
    )
    return 0 if ok else 1


def cmd_serve(args: argparse.Namespace) -> int:
    from scripts.dev import main as dev_main

    argv = ["--demo"] if args.demo else []
    if args.clean:
        argv.append("--clean")
    if args.once:
        argv.append("--once")
    return dev_main(argv)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="bastion", description="BastionLoop evidence and arena CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    keys = sub.add_parser("keys", help="key management")
    keys_sub = keys.add_subparsers(dest="keys_command", required=True)
    keys_init = keys_sub.add_parser("init", help="generate signer, witness and control keys")
    keys_init.add_argument("--force", action="store_true")
    keys_init.set_defaults(func=cmd_keys)

    verify = sub.add_parser("verify", help="verify a PCF or ledger export")
    verify.add_argument("file")
    verify.add_argument("--anchor", help="anchor service URL for live anchor entries")
    verify.add_argument("--json", action="store_true")
    verify.set_defaults(func=cmd_verify)

    suite = sub.add_parser("suite", help="run the isolation challenge suite")
    suite.add_argument("--tests", nargs="*", help="subset of test IDs")
    suite.add_argument("--mode", default=None)
    suite.add_argument("--report", action="store_true")
    suite.add_argument("--verbose", action="store_true")
    suite.set_defaults(func=cmd_suite)

    report = sub.add_parser("report", help="export the Trust Report (JSON and PDF)")
    report.set_defaults(func=cmd_report)

    tamper = sub.add_parser("tamper", help="tamper with an exported disposable ledger")
    tamper.add_argument("--mode", default="edit", choices=["edit", "edit-rechain", "delete", "reorder", "truncate", "truncate-rechain"])
    tamper.add_argument("--seq", type=int)
    tamper.set_defaults(func=cmd_tamper)

    health = sub.add_parser("health", help="show gateway and service health")
    health.set_defaults(func=cmd_health)

    export_keys = sub.add_parser("export-pinned", help="export pinned public keys for the browser verifier")
    export_keys.add_argument("output", nargs="?")
    export_keys.set_defaults(func=cmd_export_keys)

    demo = sub.add_parser("demo", help="run the end-to-end demo against a running arena")
    demo.add_argument("--mode", default="hardened", choices=["hardened", "naive"])
    demo.add_argument("--benchmark", default="jailbreakbench-subset.v1")
    demo.add_argument("--cases", type=int, default=6)
    demo.add_argument("--suite", action="store_true")
    demo.add_argument("--write-pcf", action="store_true")
    demo.set_defaults(func=cmd_demo)

    serve = sub.add_parser("serve", help="start every service locally")
    serve.add_argument("--demo", action="store_true")
    serve.add_argument("--clean", action="store_true")
    serve.add_argument("--once", action="store_true")
    serve.set_defaults(func=cmd_serve)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except ServiceError as exc:
        print(f"service error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
