# apps/api/cortex/invariants.py
"""TARS Invariants Enforcement Engine.

Executes sub-50ms deterministic verification of codebase invariants against Tree-sitter AST queries
and `.tars/invariants.yaml` rules.
"""
import os
import subprocess
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml

from apps.api.schemas.contracts import InvariantCheckResult
from .ast_parser import TarsASTParser
from .graph import TarsGraph


class InvariantsEngine:
    """Core sentinel for evaluating architectural invariants."""

    def __init__(self, root_dir: Optional[Path] = None):
        self.root_dir = root_dir or Path(__file__).resolve().parents[3]
        self.invariants_file = self.root_dir / ".tars" / "invariants.yaml"
        self.flags_file = self.root_dir / ".tars" / "flags.yaml"
        
        self.ast_parser = TarsASTParser()
        self.graph = TarsGraph()
        
        self.invariants = self._load_invariants()
        self.pruned_flags = self._load_pruned_flags()
        self._sync_invariants_to_graph()

    def _load_invariants(self) -> List[Dict[str, Any]]:
        """Loads declarative invariant definitions from .tars/invariants.yaml."""
        if not self.invariants_file.exists():
            return []
        try:
            with open(self.invariants_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                return data.get("invariants", [])
        except Exception as e:
            print(f"Error loading invariants YAML: {e}")
            return []

    def _load_pruned_flags(self) -> List[str]:
        """Loads pruned feature flag keys from .tars/flags.yaml."""
        if not self.flags_file.exists():
            return []
        try:
            with open(self.flags_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                pruned = data.get("pruned_flags", [])
                return [p.get("key") for p in pruned if p.get("key")]
        except Exception as e:
            print(f"Error loading flags YAML: {e}")
            return []

    def _sync_invariants_to_graph(self) -> None:
        """Syncs all invariants into the Kùzu graph."""
        for inv in self.invariants:
            self.graph.add_invariant(
                inv_id=inv.get("id", ""),
                name=inv.get("name", ""),
                category=inv.get("category", ""),
                severity=inv.get("severity", "CRITICAL"),
                rationale=inv.get("rationale", ""),
                adr_ref=inv.get("provenance", {}).get("adr_ref", ""),
            )

    def evaluate_code(self, file_path: str, code: str) -> List[InvariantCheckResult]:
        """Evaluates a single code buffer against all active AST invariants in <20ms."""
        results: List[InvariantCheckResult] = []
        inv_map = {inv["id"]: inv for inv in self.invariants}

        # 1. KILLER RULE 1: HTTP inside Transaction (INV-017)
        v_017 = self.ast_parser.check_http_in_transaction(code, file_path)
        for v in v_017:
            meta = inv_map.get("INV-017", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-017",
                rule_name=meta.get("name", "HTTP Call Inside DB Transaction"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Outbound HTTP calls inside transactions hold connection pool locks open."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-017-outbox-pattern.md"),
                suggested_refactor=meta.get("suggested_refactor", "Use Transactional Outbox Pattern."),
            ))

        # 2. KILLER RULE 2: Parameter Count Mismatch (INV-021)
        v_021 = self.ast_parser.check_parameter_count_mismatch(code, file_path)
        for v in v_021:
            meta = inv_map.get("INV-021", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-021",
                rule_name=meta.get("name", "Parameter Count Mismatch in Dynamic Dispatch"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Parameter count divergence triggers out-of-bounds evaluation or crash."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-021-schema-dispatch-validation.md"),
                suggested_refactor=meta.get("suggested_refactor", "Ensure caller arguments strictly match target parameter count."),
            ))

        # 3. KILLER RULE 3: Dormant Feature Flag Resuscitation (INV-014)
        v_014 = self.ast_parser.check_dormant_flag_resuscitation(code, file_path, self.pruned_flags)
        for v in v_014:
            meta = inv_map.get("INV-014", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-014",
                rule_name=meta.get("name", "Dormant Feature Flag Resuscitation"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Reviving pruned flags triggers legacy dead code paths."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-014-feature-flag-lifecycle.md"),
                suggested_refactor=meta.get("suggested_refactor", "Remove references to pruned flags from .tars/flags.yaml."),
            ))

        # 4. KILLER RULE 4: Plaintext Password / Secret Logging (INV-008)
        v_008 = self.ast_parser.check_plaintext_token_logging(code, file_path)
        for v in v_008:
            meta = inv_map.get("INV-008", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-008",
                rule_name=meta.get("name", "Plaintext Sensitive Entity / Token Logging"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Logging sensitive credentials leaks credentials into unencrypted logs."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-008-pii-masking-policy.md"),
                suggested_refactor=meta.get("suggested_refactor", "Mask or hash sensitive tokens prior to logging."),
            ))

        # 5. FOUNDATIONAL RULE: LocalStorage Token (INV-004)
        v_004 = self.ast_parser.check_localstorage_token(code, file_path)
        for v in v_004:
            meta = inv_map.get("INV-004", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-004",
                rule_name=meta.get("name", "Auth Token Storage Invariant"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Tokens must remain in HttpOnly SameSite cookies."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-004-auth-cookies.md"),
                suggested_refactor=meta.get("suggested_refactor", "Use setSecureCookie(res, token) instead of localStorage."),
            ))

        # 6. FOUNDATIONAL RULE: UI Presentation DB Coupling (INV-001)
        v_001 = self.ast_parser.check_presentation_db_coupling(code, file_path)
        for v in v_001:
            meta = inv_map.get("INV-001", {})
            results.append(InvariantCheckResult(
                is_breached=True,
                rule_id="INV-001",
                rule_name=meta.get("name", "Presentation-to-Database Direct Coupling"),
                violating_file=file_path,
                line_number=v["line_number"],
                rationale=meta.get("rationale", "Presentation layer must not directly access database infrastructure."),
                adr_ref=meta.get("provenance", {}).get("adr_ref", "docs/adr/ADR-001-hexagonal-layering.md"),
                suggested_refactor=meta.get("suggested_refactor", "Route database operations through service ports/adapters."),
            ))

        return results

    def check_staged(self) -> List[InvariantCheckResult]:
        """Scans all Git staged files in <45ms during pre-commit."""
        start_time = time.perf_counter()
        try:
            # Get list of staged files
            output = subprocess.check_output(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"], cwd=str(self.root_dir), text=True)
            staged_files = [f.strip() for f in output.splitlines() if f.strip()]
        except Exception:
            staged_files = []

        # Exclude tests, test scripts, mocks, and CLI tools from pre-commit blocking
        ignored_patterns = ("tests/", "test_", "/mocks/", "tars_cli.py", "scripts/")

        all_violations: List[InvariantCheckResult] = []
        for file_rel in staged_files:
            if any(p in file_rel.replace("\\", "/") for p in ignored_patterns):
                continue

            file_abs = self.root_dir / file_rel
            if file_abs.exists() and file_rel.endswith((".py", ".ts", ".tsx", ".js", ".jsx")):
                try:
                    with open(file_abs, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    violations = self.evaluate_code(file_rel, content)
                    all_violations.extend(violations)
                except Exception as e:
                    print(f"Error evaluating {file_rel}: {e}")

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return all_violations
