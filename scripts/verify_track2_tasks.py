# scripts/verify_track2_tasks.py
"""Comprehensive Task-by-Task Verification for Track 2 (Contributor 2)."""
import os
import sys
import time
from pathlib import Path

# Ensure UTF-8 console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

root_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root_dir))

from apps.api.cortex.graph import TarsGraph
from apps.api.cortex.ast_parser import TarsASTParser
from apps.api.cortex.invariants import InvariantsEngine
from apps.api.cortex.madr_writer import MadrWriter


def verify_all_tasks():
    print("=" * 80)
    print("🚀 TRACK 2 (ROLE 2: GRAPH & CORTEX): 5-TASK FORMAL VERIFICATION AUDIT")
    print("=" * 80)

    # =========================================================================
    # TASK 1: KÙZU GRAPH DATABASE
    # =========================================================================
    print("\n[TASK 1] Verifying Kùzu Graph Engine (.tars/graph.kuzu)...")
    graph = TarsGraph()
    graph.add_decision(
        decision_id="DEC-002",
        title="Session Security Policy",
        category="security/auth",
        context="Prevent token theft",
        chosen_option="Use HttpOnly SameSite cookies",
    )
    graph.add_invariant(
        inv_id="INV-017",
        name="HTTP in Transaction",
        category="database/concurrency",
        severity="CRITICAL",
        rationale="Connection pool exhaustion",
        adr_ref="docs/adr/ADR-017-outbox-pattern.md",
    )
    invariants = graph.get_all_invariants()
    decisions = graph.get_all_decisions()
    assert len(invariants) > 0, "No invariants found in Kùzu graph"
    assert len(decisions) > 0, "No decisions found in Kùzu graph"
    
    # Verify contradiction engine
    conflict = graph.check_contradiction("Store auth tokens in localStorage")
    assert conflict["has_conflict"] is True, "Contradiction check failed"
    print(f"  ✔ [PASSED] Kùzu graph initialized ({len(invariants)} Invariants, {len(decisions)} Decisions in graph).")
    print(f"  ✔ [PASSED] Semantic contradiction detection operational.")

    # =========================================================================
    # TASK 2: TREE-SITTER CONCRETE SYNTAX QUERIES
    # =========================================================================
    print("\n[TASK 2] Verifying Tree-sitter C-AST Engine...")
    parser = TarsASTParser()
    py_tree = parser.parse_code("def add(a: int, b: int) -> int: return a + b\n", "test.py")
    ts_tree = parser.parse_code("export const greet = (name: string): string => `Hello ${name}`;\n", "test.ts")
    js_tree = parser.parse_code("function log(msg) { console.log(msg); }\n", "test.js")

    assert py_tree is not None and py_tree.root_node.type == "module"
    assert ts_tree is not None and ts_tree.root_node.type == "program"
    assert js_tree is not None and js_tree.root_node.type == "program"
    print(f"  ✔ [PASSED] Python AST Parser verified (Root: {py_tree.root_node.type})")
    print(f"  ✔ [PASSED] TypeScript AST Parser verified (Root: {ts_tree.root_node.type})")
    print(f"  ✔ [PASSED] JavaScript AST Parser verified (Root: {js_tree.root_node.type})")

    # =========================================================================
    # TASK 3: THE 4 KILLER RULES
    # =========================================================================
    print("\n[TASK 3] Verifying Deterministic Enforcement of the 4 Killer Rules...")
    engine = InvariantsEngine()

    # Rule 1: INV-017 (Shopify/GitHub)
    code_017 = "with db.transaction():\n    user = db.query(User).get(1)\n    requests.post('https://api.stripe.com/charges')\n"
    v1 = engine.evaluate_code("services/pay.py", code_017)
    assert any(v.rule_id == "INV-017" for v in v1), "INV-017 detection failed"
    print(f"  ✔ [PASSED] Killer Rule 1 (INV-017: HTTP inside DB Transaction) -> BLOCKED")

    # Rule 2: INV-021 (CrowdStrike)
    code_021 = "def evaluate():\n    return interpret_content_channel(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20)\n"
    v2 = engine.evaluate_code("kernel/eval.py", code_021)
    assert any(v.rule_id == "INV-021" for v in v2), "INV-021 detection failed"
    print(f"  ✔ [PASSED] Killer Rule 2 (INV-021: Parameter Count Mismatch) -> BLOCKED")

    # Rule 3: INV-014 (Knight Capital)
    code_014 = "if config.get('POWER_PEG_ALGO'):\n    execute_trade()\n"
    v3 = engine.evaluate_code("trade/algo.py", code_014)
    assert any(v.rule_id == "INV-014" for v in v3), "INV-014 detection failed"
    print(f"  ✔ [PASSED] Killer Rule 3 (INV-014: Pruned Flag Resuscitation) -> BLOCKED")

    # Rule 4: INV-008 (Twitter/X)
    code_008 = "def login(user, password):\n    logger.info('User password is %s', password)\n"
    v4 = engine.evaluate_code("auth/login.py", code_008)
    assert any(v.rule_id == "INV-008" for v in v4), "INV-008 detection failed"
    print(f"  ✔ [PASSED] Killer Rule 4 (INV-008: Plaintext Password Logging) -> BLOCKED")

    # =========================================================================
    # TASK 4: PRE-COMMIT HOOK & SUB-50MS LATENCY
    # =========================================================================
    print("\n[TASK 4] Verifying Pre-Commit Sentinel & Sub-50ms Latency Budget...")
    hook_path = root_dir / ".git" / "hooks" / "pre-commit"
    assert hook_path.exists(), "Pre-commit git hook not installed in .git/hooks/"

    # Benchmark AST Diff scan latency
    start = time.perf_counter()
    violations = engine.evaluate_code("services/auth.py", "def authenticate(user): return True\n")
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 50.0, f"Latency budget exceeded: {elapsed_ms:.2f}ms"
    print(f"  ✔ [PASSED] Pre-commit hook active in: {hook_path}")
    print(f"  ✔ [PASSED] Scan latency: {elapsed_ms:.2f}ms (Well under 50.0ms ceiling)")

    # =========================================================================
    # TASK 5: LIVING MADR GENERATOR
    # =========================================================================
    print("\n[TASK 5] Verifying Living MADR Generation (docs/adr/)...")
    madr = MadrWriter()
    adr_file = madr.generate_madr(
        rule_id="INV-017",
        rule_name="Transactional Outbox Policy",
        violating_file="services/order.py",
        rationale="External HTTP calls inside transactions cause connection pool starvation under load.",
        suggested_refactor="Persist events to OutboxEvent table and dispatch via background worker.",
    )
    assert Path(adr_file).exists(), f"MADR file not created at {adr_file}"
    with open(adr_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert "INV-017" in content and "Transactional Outbox Policy" in content
    print(f"  ✔ [PASSED] Living MADR generated successfully at: {adr_file}")

    print("\n" + "=" * 80)
    print("🎉 ALL 5 TASKS FOR TRACK 2 ARE 100% VERIFIED, PASSING & BENCHMARKED!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    verify_all_tasks()
