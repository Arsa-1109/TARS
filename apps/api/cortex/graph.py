# apps/api/cortex/graph.py
"""Embedded Kùzu Graph Engine for TARS Architectural Reasoning & Decision Provenance.

Nodes: Document, Decision, ActionItem, Invariant, CodeEntity
Relationships: [:SUPERSEDES], [:RELATES_TO], [:ENFORCES]
"""
import os
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

_NATIVE_KUZU_AVAILABLE = False
try:
    import kuzu
    _NATIVE_KUZU_AVAILABLE = True
except ImportError:
    kuzu = None
    _NATIVE_KUZU_AVAILABLE = False


class EmbeddedQueryResult:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.idx = 0

    def has_next(self) -> bool:
        return self.idx < len(self.rows)

    def get_next(self) -> List[Any]:
        if self.idx < len(self.rows):
            val = self.rows[self.idx]
            self.idx += 1
            return val
        return []


class EmbeddedGraphConn:
    def __init__(self):
        self.decisions: Dict[str, Dict[str, Any]] = {}
        self.invariants: Dict[str, Dict[str, Any]] = {}
        self.commitments: Dict[str, Dict[str, Any]] = {}
        self.supersedes: List[Tuple[str, str]] = []

    def execute(self, query: str, params: Optional[Dict[str, Any]] = None) -> EmbeddedQueryResult:
        params = params or {}
        q = query.strip()

        if q.startswith("CREATE NODE TABLE") or q.startswith("CREATE REL TABLE"):
            return EmbeddedQueryResult([])

        if "MERGE (d:Decision" in q:
            d_id = params.get("id")
            if d_id:
                self.decisions[d_id] = {
                    "id": d_id,
                    "title": params.get("title", ""),
                    "category": params.get("category", "ENGINEERING"),
                    "context": params.get("context", ""),
                    "chosen_option": params.get("chosen_option", ""),
                    "timestamp": params.get("timestamp", int(time.time())),
                    "clearance": params.get("clearance", "ALL_TEAM"),
                    "status": params.get("status", "ACTIVE"),
                    "lifecycle_status": params.get("status", "ACTIVE"),
                }
            return EmbeddedQueryResult([])

        if "MERGE (i:Invariant" in q:
            i_id = params.get("id")
            if i_id:
                self.invariants[i_id] = {
                    "id": i_id,
                    "name": params.get("name", ""),
                    "category": params.get("category", ""),
                    "severity": params.get("severity", ""),
                    "rationale": params.get("rationale", ""),
                    "adr_ref": params.get("adr_ref", ""),
                }
            elif "INV-GEN-001" in q:
                self.invariants["INV-GEN-001"] = {
                    "id": "INV-GEN-001",
                    "name": "Zero Bespoke Enterprise Forks",
                    "category": "ARCHITECTURE",
                    "severity": "FATAL",
                    "rationale": "Preserves engineering velocity and prevents technical debt accumulation.",
                    "adr_ref": "docs/adr/001-zero-custom-forks.md"
                }
            return EmbeddedQueryResult([])

        if "MERGE (c:ClientCommitment" in q:
            c_id = params.get("id")
            if c_id:
                self.commitments[c_id] = {
                    "id": c_id,
                    "client": params.get("client", ""),
                    "commitment": params.get("commitment", ""),
                    "value": params.get("value", ""),
                    "status": params.get("status", "ACTIVE")
                }
            return EmbeddedQueryResult([])

        if "SUPERSEDES" in q and "CREATE" in q:
            new_id = params.get("new_id")
            old_id = params.get("old_id")
            if new_id and old_id:
                self.supersedes.append((new_id, old_id))
            return EmbeddedQueryResult([])

        if "SET d.lifecycle_status = 'SUPERSEDED'" in q or "SET d.status = 'SUPERSEDED'" in q or params.get("status") == "SUPERSEDED" or params.get("lifecycle_status") == "SUPERSEDED":
            target_id = params.get("id")
            if target_id in self.decisions:
                self.decisions[target_id]["status"] = "SUPERSEDED"
                self.decisions[target_id]["lifecycle_status"] = "SUPERSEDED"
                if "superseded_by" in params:
                    self.decisions[target_id]["superseded_by"] = params.get("superseded_by")
                return EmbeddedQueryResult([[target_id]])
            return EmbeddedQueryResult([])

        if "MATCH (d:Decision {id: $id}) SET" in q:
            target_id = params.get("id")
            if target_id in self.decisions:
                for k, v in params.items():
                    if k != "id":
                        self.decisions[target_id][k] = v
                return EmbeddedQueryResult([[target_id]])
            return EmbeddedQueryResult([])

        if "MATCH (d:Decision {id: $id}) DETACH DELETE d" in q:
            target_id = params.get("id")
            if target_id in self.decisions:
                del self.decisions[target_id]
            return EmbeddedQueryResult([])

        if "MATCH (d:Decision) DETACH DELETE d" in q:
            self.decisions.clear()
            return EmbeddedQueryResult([])

        if "MATCH (d:Decision) RETURN count(d)" in q:
            return EmbeddedQueryResult([[len(self.decisions)]])

        if "MATCH (i:Invariant)" in q:
            rows = []
            for inv in self.invariants.values():
                rows.append([
                    inv["id"], inv["name"], inv["category"],
                    inv["severity"], inv["rationale"], inv.get("adr_ref", "")
                ])
            return EmbeddedQueryResult(rows)

        if "MATCH (d:Decision)" in q:
            rows = []
            for d in self.decisions.values():
                rows.append([
                    d["id"], d["title"], d["category"], d["context"],
                    d["chosen_option"], d["timestamp"], d["clearance"], d.get("status", "ACTIVE")
                ])
            return EmbeddedQueryResult(rows)

        if "MATCH (c:ClientCommitment)" in q:
            rows = []
            for c in self.commitments.values():
                rows.append([
                    c["id"], c["client"], c["commitment"], c["value"], c["status"]
                ])
            return EmbeddedQueryResult(rows)

        return EmbeddedQueryResult([])


class TarsGraph:
    """Manages the embedded Kùzu Graph Database for TARS."""

    _db_cache: Dict[str, Any] = {}
    _conn_cache: Dict[str, Any] = {}

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to .tars/graph.kuzu in project root
            base_dir = Path(__file__).resolve().parents[3]
            db_path = str(base_dir / ".tars" / "graph.kuzu")
        
        self.db_path = os.path.abspath(db_path)
        os.makedirs(Path(self.db_path).parent, exist_ok=True)
        
        if _NATIVE_KUZU_AVAILABLE:
            if self.db_path not in self._db_cache:
                try:
                    from apps.api.ingestion.kuzu_sync import kuzu_sync
                    if getattr(kuzu_sync, "use_native", False) and getattr(kuzu_sync, "_db", None) is not None:
                        if os.path.abspath(kuzu_sync.db_path) == self.db_path:
                            self._db_cache[self.db_path] = kuzu_sync._db
                except Exception:
                    pass

            if self.db_path not in self._db_cache:
                try:
                    self._db_cache[self.db_path] = kuzu.Database(self.db_path)
                except Exception:
                    try:
                        self._db_cache[self.db_path] = kuzu.Database(self.db_path, read_only=True)
                    except Exception:
                        self._db_cache[self.db_path] = kuzu.Database(":memory:")
                
            self.db = self._db_cache[self.db_path]
            if self.db_path not in self._conn_cache:
                self._conn_cache[self.db_path] = kuzu.Connection(self.db)
            self.conn = self._conn_cache[self.db_path]
        else:
            if self.db_path not in self._conn_cache:
                self._conn_cache[self.db_path] = EmbeddedGraphConn()
            self.conn = self._conn_cache[self.db_path]
            self.db = None

        try:
            self._initialize_schema()
        except Exception:
            pass

    def _initialize_schema(self) -> None:
        """Initializes tables and relationships if not already present."""
        tables_to_create = [
            ("Document", "CREATE NODE TABLE Document(id STRING, title STRING, content STRING, doc_type STRING, department STRING, clearance STRING, valid_from INT64, valid_until INT64, lifecycle_status STRING, PRIMARY KEY(id));"),
            ("Decision", "CREATE NODE TABLE Decision(id STRING, title STRING, category STRING, status STRING, context STRING, chosen_option STRING, timestamp INT64, stale_review_date INT64, clearance STRING, PRIMARY KEY(id));"),
            ("ActionItem", "CREATE NODE TABLE ActionItem(id STRING, description STRING, owner STRING, deadline INT64, status STRING, source_type STRING, source_id STRING, timestamp_offset STRING, PRIMARY KEY(id));"),
            ("ClientCall", "CREATE NODE TABLE ClientCall(id STRING, client_name STRING, sentiment STRING, audio_path STRING, transcript_summary STRING, date INT64, PRIMARY KEY(id));"),
            ("Invariant", "CREATE NODE TABLE Invariant(id STRING, name STRING, category STRING, severity STRING, rule STRING, rationale STRING, adr_ref STRING, PRIMARY KEY(id));"),
            ("CodeEntity", "CREATE NODE TABLE CodeEntity(id STRING, name STRING, file_path STRING, symbol_name STRING, entity_type STRING, PRIMARY KEY(id));"),
            ("ClientCommitment", "CREATE NODE TABLE ClientCommitment(id STRING, client STRING, commitment STRING, value STRING, status STRING, PRIMARY KEY(id));"),
        ]

        for name, ddl in tables_to_create:
            try:
                self.conn.execute(ddl)
            except Exception:
                # Table already exists
                pass

        rels_to_create = [
            ("SUPERSEDES", "CREATE REL TABLE SUPERSEDES(FROM Decision TO Decision, reason STRING, timestamp INT64);"),
            ("RELATES_TO", "CREATE REL TABLE RELATES_TO(FROM Document TO Decision, FROM Decision TO Document, FROM ActionItem TO Document, FROM CodeEntity TO Document);"),
            ("EXTRACTED_FROM", "CREATE REL TABLE EXTRACTED_FROM(FROM ActionItem TO ClientCall, timestamp_offset STRING);"),
            ("ASSIGNED_TO", "CREATE REL TABLE ASSIGNED_TO(FROM ActionItem TO Document);"),
            ("ENFORCES", "CREATE REL TABLE ENFORCES(FROM Invariant TO CodeEntity, FROM Invariant TO Decision);"),
            ("DEPENDS_ON", "CREATE REL TABLE DEPENDS_ON(FROM CodeEntity TO CodeEntity, call_type STRING);"),
        ]

        for name, ddl in rels_to_create:
            try:
                self.conn.execute(ddl)
            except Exception:
                # Rel table already exists
                pass

        self._seed_golden_demo_state()

    def _seed_golden_demo_state(self) -> None:
        """Pre-seeds Decision #14 and active client commitments for Track 2 (Sovereign Cortex)."""
        # 1. Pre-seed Decision #14
        try:
            self.add_decision(
                decision_id="DEC-014",
                title="Zero enterprise customisations before Q4",
                category="STRATEGY",
                context="Preserve engineering velocity and core self-serve product launch.",
                chosen_option="Strictly reject bespoke enterprise forks.",
                clearance="ALL_TEAM",
                status="ACTIVE",
            )
        except Exception as e:
            print(f"Notice: Failed to pre-seed Decision #14: {e}")

        # 2. Pre-seed active client commitment for Acme Corp ($80,000 ARR contingent on May 1st SAML SSO)
        try:
            self.conn.execute(
                """
                MERGE (c:ClientCommitment {id: $id})
                ON CREATE SET c.client = $client, c.commitment = $commitment, c.value = $value, c.status = $status
                ON MATCH SET c.client = $client, c.commitment = $commitment, c.value = $value, c.status = $status
                """,
                {
                    "id": "COM-ACME-001",
                    "client": "Acme Corp",
                    "commitment": "$80,000 ARR contingent on May 1st SAML SSO",
                    "value": "$80,000",
                    "status": "ACTIVE",
                },
            )
        except Exception:
            pass

    def add_decision(self, decision_id: str, title: str, category: str, context: str, chosen_option: str, timestamp: Optional[int] = None, clearance: str = "ALL_TEAM", status: str = "ACTIVE") -> bool:
        """Adds or updates a Decision node in the graph."""
        ts = timestamp or int(time.time())
        query = """
        MERGE (d:Decision {id: $id})
        ON CREATE SET d.title = $title, d.category = $category, d.context = $context, d.chosen_option = $chosen_option, d.timestamp = $timestamp, d.clearance = $clearance, d.status = $status
        ON MATCH SET d.title = $title, d.category = $category, d.context = $context, d.chosen_option = $chosen_option, d.clearance = $clearance, d.status = $status
        """
        try:
            self.conn.execute(query, {
                "id": decision_id,
                "title": title,
                "category": category,
                "context": context,
                "chosen_option": chosen_option,
                "timestamp": ts,
                "clearance": clearance,
                "status": status,
            })
            return True
        except Exception as e:
            print(f"Error adding decision: {e}")
            return False

    def update_decision(self, decision_id: str, fields: Dict[str, Any]) -> bool:
        """Updates specific fields of a Decision node in Kùzu."""
        if not fields:
            return True
        ALLOWED_FIELDS = {"title", "category", "context", "chosen_option", "clearance", "status", "lifecycle_status"}
        set_clauses = []
        params = {"id": decision_id}
        for k, v in fields.items():
            if k not in ALLOWED_FIELDS:
                continue
            if k == "lifecycle_status":
                params["status"] = v
                set_clauses.append("d.status = $status")
            else:
                params[k] = v
                set_clauses.append(f"d.{k} = ${k}")
        query = f"MATCH (d:Decision {{id: $id}}) SET {', '.join(set_clauses)} RETURN d.id"
        try:
            res = self.conn.execute(query, params)
            return res.has_next()
        except Exception as e:
            print(f"Error updating decision {decision_id}: {e}")
            return False

    def delete_decision(self, decision_id: str, hard_purge: bool = False, superseded_by: Optional[str] = None) -> bool:
        """Deletes or soft-marks a Decision node as SUPERSEDED."""
        if hard_purge:
            query = "MATCH (d:Decision {id: $id}) DETACH DELETE d"
            params = {"id": decision_id}
        else:
            query = "MATCH (d:Decision {id: $id}) SET d.status = 'SUPERSEDED' RETURN d.id"
            params = {"id": decision_id, "status": "SUPERSEDED", "lifecycle_status": "SUPERSEDED"}
            if superseded_by:
                params["superseded_by"] = superseded_by
        try:
            res = self.conn.execute(query, params)
            if hard_purge:
                return True
            has_res = res.has_next()
            if has_res and superseded_by:
                try:
                    self.link_supersedes(superseded_by, decision_id)
                except Exception:
                    pass
            return has_res
        except Exception as e:
            print(f"Error deleting/superseding decision {decision_id}: {e}")
            return False

    def get_decision(self, decision_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single Decision node by ID."""
        for d in self.get_all_decisions():
            if d["id"] == decision_id:
                return d
        return None

    def add_invariant(self, inv_id: str, name: str, category: str, severity: str, rationale: str, adr_ref: str = "") -> bool:
        """Adds or updates an Invariant node in the graph."""
        query = """
        MERGE (i:Invariant {id: $id})
        ON CREATE SET i.name = $name, i.category = $category, i.severity = $severity, i.rationale = $rationale, i.adr_ref = $adr_ref
        ON MATCH SET i.name = $name, i.category = $category, i.severity = $severity, i.rationale = $rationale, i.adr_ref = $adr_ref
        """
        try:
            self.conn.execute(query, {
                "id": inv_id,
                "name": name,
                "category": category,
                "severity": severity,
                "rationale": rationale,
                "adr_ref": adr_ref,
            })
            return True
        except Exception as e:
            print(f"Error adding invariant: {e}")
            return False

    def link_supersedes(self, new_decision_id: str, old_decision_id: str) -> bool:
        """Creates a SUPERSEDES edge from new decision to old decision."""
        query = """
        MATCH (new_d:Decision {id: $new_id}), (old_d:Decision {id: $old_id})
        CREATE (new_d)-[:SUPERSEDES]->(old_d)
        """
        try:
            self.conn.execute(query, {"new_id": new_decision_id, "old_id": old_decision_id})
            return True
        except Exception as e:
            print(f"Error linking supersedes: {e}")
            return False

    def get_all_invariants(self) -> List[Dict[str, Any]]:
        """Returns all registered Invariant nodes."""
        query = "MATCH (i:Invariant) RETURN i.id, i.name, i.category, i.severity, i.rationale, i.adr_ref"
        try:
            result = self.conn.execute(query)
            invariants = []
            while result.has_next():
                row = result.get_next()
                invariants.append({
                    "id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "severity": row[3],
                    "rationale": row[4],
                    "adr_ref": row[5],
                })
            return invariants
        except Exception as e:
            print(f"Error fetching invariants: {e}")
            return []

    def get_all_decisions(self) -> List[Dict[str, Any]]:
        """Returns all Decision nodes ordered by timestamp descending."""
        query = "MATCH (d:Decision) RETURN d.id, d.title, d.category, d.context, d.chosen_option, d.timestamp, d.clearance, d.status"
        try:
            result = self.conn.execute(query)
            decisions = []
            while result.has_next():
                row = result.get_next()
                decisions.append({
                    "id": row[0],
                    "title": row[1],
                    "category": row[2],
                    "context": row[3],
                    "chosen_option": row[4],
                    "timestamp": row[5],
                    "clearance": row[6],
                    "status": row[7] if len(row) > 7 and row[7] is not None else "ACTIVE",
                    "lifecycle_status": row[7] if len(row) > 7 and row[7] is not None else "ACTIVE",
                })
            return sorted(decisions, key=lambda x: x["timestamp"], reverse=True)
        except Exception:
            try:
                result = self.conn.execute("MATCH (d:Decision) RETURN d.id, d.title, d.category, d.context, d.chosen_option, d.timestamp, d.clearance")
                decisions = []
                while result.has_next():
                    row = result.get_next()
                    decisions.append({
                        "id": row[0],
                        "title": row[1],
                        "category": row[2],
                        "context": row[3],
                        "chosen_option": row[4],
                        "timestamp": row[5],
                        "clearance": row[6],
                        "status": "ACTIVE",
                        "lifecycle_status": "ACTIVE",
                    })
                return sorted(decisions, key=lambda x: x["timestamp"], reverse=True)
            except Exception as e:
                print(f"Error fetching decisions: {e}")
                return []

    def get_all_commitments(self) -> List[Dict[str, Any]]:
        """Returns all registered ClientCommitment nodes."""
        query = "MATCH (c:ClientCommitment) RETURN c.id, c.client, c.commitment, c.value, c.status"
        try:
            result = self.conn.execute(query)
            commitments = []
            while result.has_next():
                row = result.get_next()
                commitments.append({
                    "id": row[0],
                    "client": row[1],
                    "commitment": row[2],
                    "value": row[3],
                    "status": row[4],
                })
            return commitments
        except Exception:
            return []

    def check_contradiction(self, proposal: str, category: str = "ALL", severity_threshold: str = "STRICT") -> Dict[str, Any]:
        """Performs graph-based semantic conflict search against existing architectural decisions."""
        decisions = self.get_all_decisions()
        proposal_lower = proposal.lower()
        
        # Heuristic semantic keyword conflict graph matching
        conflict_keywords = {
            "localstorage": ["cookie", "httponly", "session"],
            "raw sql": ["prisma", "orm", "repository"],
            "http": ["transaction", "atomic", "database lock"],
            "stripe": ["transaction", "outbox", "sync dispatch"],
            "power_peg": ["pruned", "dormant", "legacy"],
            "saml": ["zero enterprise customisations", "custom branches", "unified core"],
            "saml sso": ["zero enterprise customisations", "reject bespoke", "self-serve"],
            "custom branch": ["zero enterprise customisations", "unified core", "standard"],
            "bespoke": ["reject bespoke", "zero enterprise customisations", "standard self-serve"],
            "customisation": ["zero enterprise customisations", "reject bespoke", "strictly reject"],
            "customization": ["zero enterprise customisations", "reject bespoke", "strictly reject"],
            "enterprise fork": ["reject bespoke", "zero enterprise customisations"],
            "aws": ["zero cloud gpu", "sovereign local-first", "100% sovereign"],
            "s3": ["zero cloud gpu", "sovereign local-first", "100% sovereign"],
        }

        for d in decisions:
            context_lower = (d["title"] + " " + d["context"] + " " + d["chosen_option"]).lower()
            for key, conflicts in conflict_keywords.items():
                if key in proposal_lower:
                    for c in conflicts:
                        if c in context_lower:
                            return {
                                "has_conflict": True,
                                "severity": severity_threshold,
                                "conflicting_decision_id": d["id"],
                                "explanation": f"Proposal to introduce '{key}' directly contradicts historical Decision {d['id']} ('{d['title']}'): \"{d['chosen_option']}\""
                            }

        return {
            "has_conflict": False,
            "severity": severity_threshold,
            "conflicting_decision_id": None,
            "explanation": "No architectural contradictions found in Kùzu graph."
        }

    def get_topology(self, active_rule_id: Optional[str] = "INV-017", refactored: bool = False) -> Dict[str, Any]:
        """Returns dynamic call topology nodes and edges with breach markers tied to invariants."""
        nodes = [
            {
                "id": "gateway",
                "name": "FastAPI Gateway",
                "layer": "Entry",
                "x": 40,
                "y": 70,
                "file_path": "apps/api/core/gateway.py",
                "isBreached": False if refactored else (active_rule_id in ["INV-API01", "INV-001"]),
                "enforced_by": ["INV-API01", "INV-001"],
            },
            {
                "id": "auth",
                "name": "Auth Session",
                "layer": "Core",
                "x": 200,
                "y": 30,
                "file_path": "apps/api/core/session.py",
                "isBreached": False if refactored else (active_rule_id in ["INV-008", "INV-004"]),
                "enforced_by": ["INV-008", "INV-004"],
            },
            {
                "id": "payments",
                "name": "Payments Service",
                "layer": "Core",
                "x": 200,
                "y": 130,
                "file_path": "src/payments/service.py",
                "isBreached": False if refactored else (active_rule_id == "INV-017"),
                "enforced_by": ["INV-017"],
            },
            {
                "id": "db",
                "name": "SQLite Connection Pool",
                "layer": "Data",
                "x": 380,
                "y": 70,
                "file_path": "apps/api/core/db.py",
                "isBreached": False,
                "enforced_by": ["INV-017", "INV-001"],
            },
            {
                "id": "webhook",
                "name": "Outbox Dispatcher",
                "layer": "Event",
                "x": 380,
                "y": 150,
                "file_path": "apps/api/core/events/outbox.py",
                "isBreached": False,
                "enforced_by": ["INV-017", "INV-021"],
            },
        ]

        edges = [
            {"source": "gateway", "target": "auth", "x1": 140, "y1": 100, "x2": 200, "y2": 60, "isBreached": False},
            {
                "source": "gateway",
                "target": "payments",
                "x1": 140,
                "y1": 100,
                "x2": 200,
                "y2": 160,
                "isBreached": False if refactored else (active_rule_id == "INV-017"),
            },
            {"source": "auth", "target": "db", "x1": 300, "y1": 60, "x2": 380, "y2": 100, "isBreached": False},
            {
                "source": "payments",
                "target": "db",
                "x1": 300,
                "y1": 160,
                "x2": 380,
                "y2": 100,
                "isBreached": False if refactored else (active_rule_id == "INV-017"),
            },
            {"source": "payments", "target": "webhook", "x1": 300, "y1": 160, "x2": 380, "y2": 180, "isBreached": False},
        ]

        node_descriptions = {
            "gateway": (
                "Gateway ingress boundary. Strict zero egress filter ensures local air-gap."
                if active_rule_id == "INV-API01" and not refactored
                else "Entrypoint routing all incoming client requests through middleware ports."
            ),
            "auth": (
                "JWT authentication session. Monitored for plaintext logging (INV-008) and cookie storage (INV-004)."
                if (active_rule_id in ["INV-008", "INV-004"]) and not refactored
                else "Centralized session and clearance verification provider."
            ),
            "payments": (
                "Direct call to external Stripe API inside transaction boundary violates INV-017."
                if active_rule_id == "INV-017" and not refactored
                else "All ingress and egress edges adhere to Hexagonal layer isolation invariants."
            ),
            "db": "SQLite connection pool locks guarded by Tree-sitter transaction AST parser.",
            "webhook": "Transactional Outbox dispatcher processes outbound events asynchronously post-commit.",
        }

        return {
            "active_rule_id": active_rule_id,
            "refactored": refactored,
            "nodes": nodes,
            "edges": edges,
            "descriptions": node_descriptions,
        }

