# apps/api/ingestion/kuzu_sync.py
"""
Track 3: Embedded Kùzu Graph Database Engine (SDD Section 3.1)
Manages institutional memory, node tables (Document, Decision, ActionItem, ClientCall, Invariant, CodeEntity),
and temporal relationships ([:SUPERSEDES], [:RELATES_TO], [:EXTRACTED_FROM], [:ENFORCES]).
Persists graph state to .tars/graph.kuzu with zero-lock architecture and standalone fallback.
"""
import logging
import os
import sqlite3
import threading
import time
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("tars.ingestion.kuzu_sync")

DEFAULT_KUZU_DIR = os.path.abspath(os.path.join(os.getcwd(), ".tars", "graph.kuzu"))

# Check for native kuzu C-extension
_NATIVE_KUZU_AVAILABLE = False
try:
    import kuzu
    _NATIVE_KUZU_AVAILABLE = True
except ImportError:
    _NATIVE_KUZU_AVAILABLE = False


class KuzuGraphEngine:
    """
    Kùzu Graph Manager with dual-mode support:
    - Native Kùzu engine when compiled wheels are available.
    - Embedded SQLite-backed columnar graph emulator for Python 3.14+ / zero-dependency air-gap.
    """

    def __init__(self, db_path: str = DEFAULT_KUZU_DIR, read_only: bool = False):
        self.db_path = db_path
        self.read_only = read_only
        self._lock = threading.Lock()
        self._db = None
        self._conn = None
        self.use_native = _NATIVE_KUZU_AVAILABLE

        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_engine()

    def _init_engine(self):
        """Initializes database connection and runs DDL schema migrations."""
        if self.use_native:
            try:
                logger.info(f"Initializing Native Kùzu Database at: {self.db_path} (read_only={self.read_only})")
                self._db = kuzu.Database(self.db_path, read_only=self.read_only)
                self._conn = kuzu.Connection(self._db)
                if not self.read_only:
                    self._create_native_schema()
                return
            except Exception as e:
                logger.warning(f"Native Kùzu init failed ({e}). Falling back to Embedded Graph Engine.")
                self.use_native = False

        # Fallback pure-python graph engine using SQLite for node/rel storage
        fallback_db = os.path.join(os.path.dirname(self.db_path), "graph_store.db")
        self._sqlite_path = fallback_db
        logger.info(f"Initializing Embedded Graph Engine (SQLite-backed) at: {fallback_db}")
        self._create_fallback_schema()

    # ========================================================
    # NATIVE KUZU SCHEMA
    # ========================================================
    def _create_native_schema(self):
        """Executes native Cypher DDL statements from SDD Section 3.1."""
        ddl_statements = [
            """CREATE NODE TABLE IF NOT EXISTS Document (
                id STRING,
                title STRING,
                department STRING,
                clearance STRING,
                valid_from INT64,
                valid_until INT64,
                lifecycle_status STRING,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS Decision (
                id STRING,
                title STRING,
                category STRING,
                status STRING,
                context STRING,
                chosen_option STRING,
                timestamp INT64,
                stale_review_date INT64,
                clearance STRING,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS ActionItem (
                id STRING,
                description STRING,
                owner STRING,
                deadline INT64,
                status STRING,
                source_type STRING,
                source_id STRING,
                timestamp_offset STRING,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS ClientCall (
                id STRING,
                client_name STRING,
                sentiment STRING,
                audio_path STRING,
                transcript_summary STRING,
                date INT64,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS Invariant (
                id STRING,
                name STRING,
                rule STRING,
                rationale STRING,
                adr_ref STRING,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS CodeEntity (
                id STRING,
                file_path STRING,
                symbol_name STRING,
                entity_type STRING,
                PRIMARY KEY (id)
            );""",
            "CREATE REL TABLE IF NOT EXISTS RELATES_TO (FROM Document TO Decision);",
            "CREATE REL TABLE IF NOT EXISTS SUPERSEDES (FROM Decision TO Decision, reason STRING, timestamp INT64);",
            "CREATE REL TABLE IF NOT EXISTS EXTRACTED_FROM (FROM ActionItem TO ClientCall, timestamp_offset STRING);",
            "CREATE REL TABLE IF NOT EXISTS ASSIGNED_TO (FROM ActionItem TO Document);",
            "CREATE REL TABLE IF NOT EXISTS ENFORCES (FROM Invariant TO CodeEntity);",
            "CREATE REL TABLE IF NOT EXISTS DEPENDS_ON (FROM CodeEntity TO CodeEntity, call_type STRING);",
        ]
        for stmt in ddl_statements:
            try:
                self._conn.execute(stmt)
            except Exception as e:
                # Table might already exist or DDL not supported with IF NOT EXISTS
                logger.debug(f"DDL notice: {e}")

    # ========================================================
    # EMBEDDED FALLBACK GRAPH SCHEMA
    # ========================================================
    def _create_fallback_schema(self):
        with sqlite3.connect(self._sqlite_path) as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA journal_mode = WAL;")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS graph_nodes (
                node_type TEXT NOT NULL,
                id TEXT NOT NULL,
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (node_type, id)
            );
            """)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS graph_edges (
                edge_type TEXT NOT NULL,
                from_type TEXT NOT NULL,
                from_id TEXT NOT NULL,
                to_type TEXT NOT NULL,
                to_id TEXT NOT NULL,
                data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (edge_type, from_type, from_id, to_type, to_id)
            );
            """)
            conn.commit()

    # ========================================================
    # GRAPH SYNCHRONIZATION OPERATIONS
    # ========================================================
    def sync_document(
        self,
        doc_id: str,
        title: str,
        department: str = "GENERAL",
        clearance: str = "ALL_TEAM",
        valid_from: Optional[int] = None,
        valid_until: Optional[int] = None,
        lifecycle_status: str = "ACTIVE",
    ) -> bool:
        valid_from = valid_from or int(time.time())
        valid_until = valid_until or int(time.time() + 31536000)

        with self._lock:
            if self.use_native and self._conn:
                try:
                    query = """
                    MERGE (d:Document {id: $id})
                    ON CREATE SET d.title = $title, d.department = $department, d.clearance = $clearance,
                                  d.valid_from = $valid_from, d.valid_until = $valid_until, d.lifecycle_status = $status
                    ON MATCH SET d.title = $title, d.department = $department, d.clearance = $clearance,
                                 d.lifecycle_status = $status;
                    """
                    self._conn.execute(
                        query,
                        {
                            "id": doc_id,
                            "title": title,
                            "department": department,
                            "clearance": clearance,
                            "valid_from": valid_from,
                            "valid_until": valid_until,
                            "status": lifecycle_status,
                        },
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_document error: {e}")

            # Fallback execution
            import json
            data = {
                "id": doc_id,
                "title": title,
                "department": department,
                "clearance": clearance,
                "valid_from": valid_from,
                "valid_until": valid_until,
                "lifecycle_status": lifecycle_status,
            }
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("Document", doc_id, json.dumps(data)),
                )
                conn.commit()
            return True

    def sync_decision(
        self,
        decision_id: str,
        title: str,
        category: str = "ARCHITECTURE",
        status: str = "ACTIVE",
        context: str = "",
        chosen_option: str = "",
        timestamp: Optional[int] = None,
        stale_review_date: Optional[int] = None,
        clearance: str = "ALL_TEAM",
        supersedes_id: Optional[str] = None,
        supersedes_reason: Optional[str] = None,
    ) -> bool:
        """
        Inserts or updates a Decision node. If supersedes_id is provided,
        creates a temporal [:SUPERSEDES] edge and marks superseded decision as DEPRECATED.
        """
        timestamp = timestamp or int(time.time())
        stale_review_date = stale_review_date or int(time.time() + (90 * 86400))

        with self._lock:
            import json
            data = {
                "id": decision_id,
                "title": title,
                "category": category,
                "status": status,
                "context": context,
                "chosen_option": chosen_option,
                "timestamp": timestamp,
                "stale_review_date": stale_review_date,
                "clearance": clearance,
            }

            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (d:Decision {id: $id})
                        ON CREATE SET d.title = $title, d.category = $category, d.status = $status,
                                      d.context = $context, d.chosen_option = $opt, d.timestamp = $ts,
                                      d.stale_review_date = $stale, d.clearance = $clearance
                        ON MATCH SET d.title = $title, d.status = $status, d.chosen_option = $opt;
                        """,
                        {
                            "id": decision_id,
                            "title": title,
                            "category": category,
                            "status": status,
                            "context": context,
                            "opt": chosen_option,
                            "ts": timestamp,
                            "stale": stale_review_date,
                            "clearance": clearance,
                        },
                    )
                    if supersedes_id:
                        self._conn.execute(
                            """
                            MATCH (newD:Decision {id: $new_id}), (oldD:Decision {id: $old_id})
                            CREATE (newD)-[:SUPERSEDES {reason: $reason, timestamp: $ts}]->(oldD)
                            SET oldD.status = 'SUPERSEDED';
                            """,
                            {
                                "new_id": decision_id,
                                "old_id": supersedes_id,
                                "reason": supersedes_reason or "Superseded by newer decision",
                                "ts": timestamp,
                            },
                        )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_decision error: {e}")

            # Fallback
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("Decision", decision_id, json.dumps(data)),
                )
                if supersedes_id:
                    edge_data = {"reason": supersedes_reason or "Superseded", "timestamp": timestamp}
                    conn.execute(
                        "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                        ("SUPERSEDES", "Decision", decision_id, "Decision", supersedes_id, json.dumps(edge_data)),
                    )
                    # Mark old decision status
                    cur = conn.cursor()
                    cur.execute("SELECT data FROM graph_nodes WHERE node_type = 'Decision' AND id = ?;", (supersedes_id,))
                    row = cur.fetchone()
                    if row:
                        old_data = json.loads(row[0])
                        old_data["status"] = "SUPERSEDED"
                        conn.execute(
                            "UPDATE graph_nodes SET data = ? WHERE node_type = 'Decision' AND id = ?;",
                            (json.dumps(old_data), supersedes_id),
                        )
                conn.commit()
            return True

    def sync_client_call(
        self,
        call_id: str,
        client_name: str,
        sentiment: str,
        audio_path: str,
        transcript_summary: str,
        date: Optional[int] = None,
    ) -> bool:
        date = date or int(time.time())
        with self._lock:
            import json
            data = {
                "id": call_id,
                "client_name": client_name,
                "sentiment": sentiment,
                "audio_path": audio_path,
                "transcript_summary": transcript_summary,
                "date": date,
            }
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (c:ClientCall {id: $id})
                        ON CREATE SET c.client_name = $name, c.sentiment = $sentiment, c.audio_path = $path,
                                      c.transcript_summary = $summary, c.date = $date
                        ON MATCH SET c.sentiment = $sentiment, c.transcript_summary = $summary;
                        """,
                        {
                            "id": call_id,
                            "name": client_name,
                            "sentiment": sentiment,
                            "path": audio_path,
                            "summary": transcript_summary,
                            "date": date,
                        },
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_client_call error: {e}")

            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("ClientCall", call_id, json.dumps(data)),
                )
                conn.commit()
            return True

    def sync_action_item(
        self,
        item_id: str,
        description: str,
        owner: str = "Unassigned",
        deadline: Optional[int] = None,
        status: str = "OPEN",
        source_type: str = "CLIENT_CALL",
        source_id: str = "",
        timestamp_offset: str = "00:00",
    ) -> bool:
        with self._lock:
            import json
            data = {
                "id": item_id,
                "description": description,
                "owner": owner,
                "deadline": deadline,
                "status": status,
                "source_type": source_type,
                "source_id": source_id,
                "timestamp_offset": timestamp_offset,
            }
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (a:ActionItem {id: $id})
                        ON CREATE SET a.description = $desc, a.owner = $owner, a.deadline = $deadline,
                                      a.status = $status, a.source_type = $stype, a.source_id = $sid,
                                      a.timestamp_offset = $offset
                        ON MATCH SET a.description = $desc, a.owner = $owner, a.status = $status;
                        """,
                        {
                            "id": item_id,
                            "desc": description,
                            "owner": owner,
                            "deadline": deadline or 0,
                            "status": status,
                            "stype": source_type,
                            "sid": source_id,
                            "offset": timestamp_offset,
                        },
                    )
                    if source_type in ["CLIENT_CALL", "CALL"] and source_id:
                        self._conn.execute(
                            """
                            MATCH (a:ActionItem {id: $aid}), (c:ClientCall {id: $cid})
                            CREATE (a)-[:EXTRACTED_FROM {timestamp_offset: $offset}]->(c);
                            """,
                            {"aid": item_id, "cid": source_id, "offset": timestamp_offset},
                        )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_action_item error: {e}")

            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("ActionItem", item_id, json.dumps(data)),
                )
                if source_type in ["CLIENT_CALL", "CALL"] and source_id:
                    conn.execute(
                        "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                        ("EXTRACTED_FROM", "ActionItem", item_id, "ClientCall", source_id, json.dumps({"timestamp_offset": timestamp_offset})),
                    )
                conn.commit()
            return True

    def get_superseded_chain(self, decision_id: str) -> List[Dict[str, Any]]:
        """Traverses temporal [:SUPERSEDES] edges to identify decision history."""
        chain = []
        with self._lock:
            if self.use_native and self._conn:
                try:
                    res = self._conn.execute(
                        """
                        MATCH (current:Decision {id: $id})-[:SUPERSEDES*]->(ancestor:Decision)
                        RETURN ancestor.id, ancestor.title, ancestor.status, ancestor.timestamp;
                        """,
                        {"id": decision_id},
                    )
                    while res.has_next():
                        row = res.get_next()
                        chain.append({
                            "id": row[0],
                            "title": row[1],
                            "status": row[2],
                            "timestamp": row[3],
                        })
                    return chain
                except Exception as e:
                    logger.warning(f"Native get_superseded_chain error: {e}")

            # Fallback recursive traversal
            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                cur = conn.cursor()
                curr_id = decision_id
                visited = set()
                while curr_id and curr_id not in visited:
                    visited.add(curr_id)
                    cur.execute(
                        "SELECT to_id, data FROM graph_edges WHERE edge_type = 'SUPERSEDES' AND from_type = 'Decision' AND from_id = ?;",
                        (curr_id,),
                    )
                    edge = cur.fetchone()
                    if not edge:
                        break
                    to_id, edge_data = edge
                    cur.execute("SELECT data FROM graph_nodes WHERE node_type = 'Decision' AND id = ?;", (to_id,))
                    node_row = cur.fetchone()
                    if node_row:
                        node_dict = json.loads(node_row[0])
                        chain.append(node_dict)
                    curr_id = to_id
            return chain

    def get_stats(self) -> Dict[str, Any]:
        """Returns node and relationship statistics for GUI and system resource gauges."""
        with self._lock:
            if self.use_native and self._conn:
                try:
                    stats = {"engine": "native_kuzu", "nodes": {}, "edges": {}}
                    for node_tab in ["Document", "Decision", "ActionItem", "ClientCall", "Invariant", "CodeEntity"]:
                        res = self._conn.execute(f"MATCH (n:{node_tab}) RETURN count(n);")
                        if res.has_next():
                            stats["nodes"][node_tab] = res.get_next()[0]
                    return stats
                except Exception as e:
                    logger.warning(f"Native get_stats error: {e}")

            # Fallback stats
            with sqlite3.connect(self._sqlite_path) as conn:
                cur = conn.cursor()
                cur.execute("SELECT node_type, count(*) FROM graph_nodes GROUP BY node_type;")
                node_counts = {row[0]: row[1] for row in cur.fetchall()}
                cur.execute("SELECT edge_type, count(*) FROM graph_edges GROUP BY edge_type;")
                edge_counts = {row[0]: row[1] for row in cur.fetchall()}
                return {
                    "engine": "embedded_graph_store",
                    "nodes": node_counts,
                    "edges": edge_counts,
                }


# Global singleton instance
kuzu_sync = KuzuGraphEngine()
