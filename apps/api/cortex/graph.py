# apps/api/cortex/graph.py
"""Embedded Kùzu Graph Engine for TARS Architectural Reasoning & Decision Provenance.

Nodes: Document, Decision, ActionItem, Invariant, CodeEntity
Relationships: [:SUPERSEDES], [:RELATES_TO], [:ENFORCES]
"""
import os
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import kuzu


class TarsGraph:
    """Manages the embedded Kùzu Graph Database for TARS."""

    _db_cache: Dict[str, kuzu.Database] = {}
    _conn_cache: Dict[str, kuzu.Connection] = {}

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to .tars/graph.kuzu in project root
            base_dir = Path(__file__).resolve().parents[3]
            db_path = str(base_dir / ".tars" / "graph.kuzu")
        
        self.db_path = os.path.abspath(db_path)
        os.makedirs(Path(self.db_path).parent, exist_ok=True)
        
        if self.db_path not in self._db_cache:
            self._db_cache[self.db_path] = kuzu.Database(self.db_path)
            self._conn_cache[self.db_path] = kuzu.Connection(self._db_cache[self.db_path])
        
        self.db = self._db_cache[self.db_path]
        self.conn = self._conn_cache[self.db_path]
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        """Initializes tables and relationships if not already present."""
        tables_to_create = [
            ("Document", "CREATE NODE TABLE Document(id STRING, title STRING, content STRING, doc_type STRING, PRIMARY KEY(id));"),
            ("Decision", "CREATE NODE TABLE Decision(id STRING, title STRING, category STRING, context STRING, chosen_option STRING, timestamp INT64, clearance STRING, PRIMARY KEY(id));"),
            ("ActionItem", "CREATE NODE TABLE ActionItem(id STRING, description STRING, owner STRING, status STRING, source_type STRING, PRIMARY KEY(id));"),
            ("Invariant", "CREATE NODE TABLE Invariant(id STRING, name STRING, category STRING, severity STRING, rationale STRING, adr_ref STRING, PRIMARY KEY(id));"),
            ("CodeEntity", "CREATE NODE TABLE CodeEntity(id STRING, name STRING, file_path STRING, entity_type STRING, PRIMARY KEY(id));"),
        ]

        for name, ddl in tables_to_create:
            try:
                self.conn.execute(ddl)
            except Exception:
                # Table already exists
                pass

        rels_to_create = [
            ("SUPERSEDES", "CREATE REL TABLE SUPERSEDES(FROM Decision TO Decision);"),
            ("RELATES_TO", "CREATE REL TABLE RELATES_TO(FROM Decision TO Document, FROM ActionItem TO Document, FROM CodeEntity TO Document);"),
            ("ENFORCES", "CREATE REL TABLE ENFORCES(FROM Invariant TO CodeEntity, FROM Invariant TO Decision);"),
        ]

        for name, ddl in rels_to_create:
            try:
                self.conn.execute(ddl)
            except Exception:
                # Rel table already exists
                pass

    def add_decision(self, decision_id: str, title: str, category: str, context: str, chosen_option: str, timestamp: Optional[int] = None, clearance: str = "ALL_TEAM") -> bool:
        """Adds or updates a Decision node in the graph."""
        ts = timestamp or int(time.time())
        query = """
        MERGE (d:Decision {id: $id})
        ON CREATE SET d.title = $title, d.category = $category, d.context = $context, d.chosen_option = $chosen_option, d.timestamp = $timestamp, d.clearance = $clearance
        ON MATCH SET d.title = $title, d.category = $category, d.context = $context, d.chosen_option = $chosen_option, d.clearance = $clearance
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
            })
            return True
        except Exception as e:
            print(f"Error adding decision: {e}")
            return False

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
        query = "MATCH (d:Decision) RETURN d.id, d.title, d.category, d.context, d.chosen_option, d.timestamp, d.clearance"
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
                })
            return sorted(decisions, key=lambda x: x["timestamp"], reverse=True)
        except Exception as e:
            print(f"Error fetching decisions: {e}")
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
                                "explanation": f"Proposal references '{key}' which contradicts historical Decision {d['id']} ('{d['title']}'): {d['chosen_option']}"
                            }

        return {
            "has_conflict": False,
            "severity": severity_threshold,
            "conflicting_decision_id": None,
            "explanation": "No architectural contradictions found in Kùzu graph."
        }
