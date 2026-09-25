#!/usr/bin/env python
"""TARS Pre-Commit Sentinel Hook.

Executes sub-50ms deterministic AST queries on all Git staged files.
Halts the commit immediately if any architectural invariant is violated.
"""
import sys
import time
from pathlib import Path

# Ensure UTF-8 console output across Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
root_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root_dir))

from apps.api.cortex.invariants import InvariantsEngine


def main():
    start = time.perf_counter()
    engine = InvariantsEngine(root_dir=root_dir)
    violations = engine.check_staged()
    elapsed_ms = (time.perf_counter() - start) * 1000

    if not violations:
        print(f"\033[92m[TARS] [OK] Pre-commit check PASSED ({elapsed_ms:.1f}ms) - 0 architectural violations.\033[0m")
        sys.exit(0)

    print("\n" + "=" * 80)
    print(f"\033[91m[TARS BLOCKED] [STOP] Architectural Invariant Violation Detected! ({elapsed_ms:.1f}ms)\033[0m")
    print(f"\033[93mTotal Violations: {len(violations)}\033[0m")
    print("=" * 80)

    for idx, v in enumerate(violations, start=1):
        print(f"\n\033[1m[{idx}] Violation: {v.rule_id} - {v.rule_name}\033[0m")
        print(f"    File: \033[94m{v.violating_file}:{v.line_number}\033[0m")
        print(f"    Rationale: {v.rationale}")
        print(f"    Suggested Refactor: \033[92m{v.suggested_refactor}\033[0m")
        print(f"    ADR Reference: {v.adr_ref}")

    print("\n" + "=" * 80)
    print("\033[91mCommit rejected. Fix the architectural violations above or consult your ADR records.\033[0m")
    print("=" * 80 + "\n")
    sys.exit(1)


if __name__ == "__main__":
    main()
