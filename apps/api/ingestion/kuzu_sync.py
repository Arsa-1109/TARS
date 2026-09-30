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
        self._sqlite_path = os.path.join(os.path.dirname(self.db_path), "graph_store.db")
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
                content STRING,
                doc_type STRING,
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
                category STRING,
                severity STRING,
                rule STRING,
                rationale STRING,
                adr_ref STRING,
                PRIMARY KEY (id)
            );""",
            """CREATE NODE TABLE IF NOT EXISTS CodeEntity (
                id STRING,
                name STRING,
                file_path STRING,
                symbol_name STRING,
                entity_type STRING,
                PRIMARY KEY (id)
            );""",
            "CREATE REL TABLE IF NOT EXISTS RELATES_TO (FROM Document TO Decision, FROM Decision TO Document, FROM ActionItem TO Document, FROM CodeEntity TO Document);",
            "CREATE REL TABLE IF NOT EXISTS SUPERSEDES (FROM Decision TO Decision, FROM Document TO Document, reason STRING, timestamp INT64);",
            "CREATE REL TABLE IF NOT EXISTS EXTRACTED_FROM (FROM ActionItem TO ClientCall, timestamp_offset STRING);",
            "CREATE REL TABLE IF NOT EXISTS ASSIGNED_TO (FROM ActionItem TO Document);",
            "CREATE REL TABLE IF NOT EXISTS ENFORCES (FROM Invariant TO CodeEntity, FROM Invariant TO Decision);",
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
        organisation_id: str = "CMP-GENESIS-01",
        effective_from: Optional[int] = None,
        effective_to: Optional[int] = None,
        superseded_by: Optional[str] = None,
        confidence_state: str = "CONFIRMED",
        source_mode: str = "LIVE",
        version: int = 1,
        parent_doc_id: Optional[str] = None,
    ) -> bool:
        now_ts = int(time.time())
        eff_from = effective_from or valid_from or now_ts
        eff_to = effective_to or valid_until

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
                            "valid_from": eff_from,
                            "valid_until": eff_to or (now_ts + 31536000),
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
                "valid_from": eff_from,
                "valid_until": eff_to,
                "lifecycle_status": lifecycle_status,
                "organisation_id": organisation_id,
                "effective_from": eff_from,
                "effective_to": eff_to,
                "superseded_by": superseded_by,
                "confidence_state": confidence_state,
                "source_mode": source_mode,
                "version": version,
                "parent_doc_id": parent_doc_id,
            }
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("Document", doc_id, json.dumps(data)),
                )
                conn.commit()
            return True

    def link_document_supersedes(
        self,
        new_doc_id: str,
        old_doc_id: str,
        reason: str = "VERSION_UPDATE",
        timestamp: Optional[int] = None,
    ) -> bool:
        """
        Creates a temporal [:SUPERSEDES] edge from new Document version to old Document version,
        marking the old version's lifecycle_status as 'SUPERSEDED'.
        """
        ts = timestamp or int(time.time())
        with self._lock:
            import json
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MATCH (newD:Document {id: $new_id}), (oldD:Document {id: $old_id})
                        CREATE (newD)-[:SUPERSEDES {reason: $reason, timestamp: $ts}]->(oldD)
                        SET oldD.lifecycle_status = 'SUPERSEDED';
                        """,
                        {"new_id": new_doc_id, "old_id": old_doc_id, "reason": reason, "ts": ts},
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native link_document_supersedes error: {e}")

            # Fallback execution
            with sqlite3.connect(self._sqlite_path) as conn:
                edge_data = {"reason": reason, "timestamp": ts}
                conn.execute(
                    "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                    ("SUPERSEDES", "Document", new_doc_id, "Document", old_doc_id, json.dumps(edge_data)),
                )
                cur = conn.cursor()
                cur.execute("SELECT data FROM graph_nodes WHERE node_type = 'Document' AND id = ?;", (old_doc_id,))
                row = cur.fetchone()
                if row:
                    old_data = json.loads(row[0])
                    old_data["lifecycle_status"] = "SUPERSEDED"
                    old_data["superseded_by"] = new_doc_id
                    conn.execute(
                        "UPDATE graph_nodes SET data = ? WHERE node_type = 'Document' AND id = ?;",
                        (json.dumps(old_data), old_doc_id),
                    )
                conn.commit()
            return True

    def get_document_history(self, doc_id: str) -> List[Dict[str, Any]]:
        """Traverses temporal [:SUPERSEDES] relationships backwards to retrieve document version ancestry."""
        chain = []
        with self._lock:
            if self.use_native and self._conn:
                try:
                    res = self._conn.execute(
                        """
                        MATCH (current:Document {id: $id})-[:SUPERSEDES*]->(ancestor:Document)
                        RETURN ancestor.id, ancestor.title, ancestor.lifecycle_status, ancestor.valid_from;
                        """,
                        {"id": doc_id},
                    )
                    while res.has_next():
                        row = res.get_next()
                        chain.append({
                            "id": row[0],
                            "title": row[1],
                            "status": row[2],
                            "valid_from": row[3],
                        })
                    return chain
                except Exception as e:
                    logger.warning(f"Native get_document_history error: {e}")

            # Fallback traversal
            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                cur = conn.cursor()
                curr_id = doc_id
                visited = set()
                while curr_id and curr_id not in visited:
                    visited.add(curr_id)
                    cur.execute(
                        "SELECT to_id, data FROM graph_edges WHERE edge_type = 'SUPERSEDES' AND from_type = 'Document' AND from_id = ?;",
                        (curr_id,),
                    )
                    edge = cur.fetchone()
                    if not edge:
                        break
                    to_id, edge_data = edge
                    cur.execute("SELECT data FROM graph_nodes WHERE node_type = 'Document' AND id = ?;", (to_id,))
                    node_row = cur.fetchone()
                    if node_row:
                        chain.append(json.loads(node_row[0]))
                    curr_id = to_id
            return chain

    def get_document_superseded_chain(self, doc_id: str) -> List[Dict[str, Any]]:
        """Alias for get_document_history to traverse document supersedes lineage."""
        return self.get_document_history(doc_id)

    def delete_document_atomic(self, doc_id: str) -> Dict[str, Any]:
        """
        Compensating transaction method: atomically detaches and deletes a Document
        node and its related edges from Kùzu upon downstream ingestion failure.
        """
        detached = 0
        with self._lock:
            if self.use_native and self._conn:
                try:
                    self._conn.execute("MATCH (d:Document) WHERE d.id = $doc_id DETACH DELETE d;", {"doc_id": doc_id})
                    detached += 1
                except Exception as e:
                    logger.warning(f"Native delete_document_atomic notice: {e}")
            try:
                with sqlite3.connect(self._sqlite_path) as conn:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM graph_nodes WHERE node_type = 'Document' AND id = ?;", (doc_id,))
                    detached += cur.rowcount
                    cur.execute(
                        "DELETE FROM graph_edges WHERE (from_type = 'Document' AND from_id = ?) OR (to_type = 'Document' AND to_id = ?);",
                        (doc_id, doc_id),
                    )
                    conn.commit()
            except Exception as e:
                logger.warning(f"Embedded delete_document_atomic notice: {e}")
        return {"doc_id": doc_id, "detached_count": max(1, detached)}

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

    def delete_client_call(self, call_id: str) -> Dict[str, Any]:
        """
        Prunes a recorded call node and its extracted spec/action relationships from Kùzu.
        Supports both Native Kùzu engine and SQLite-backed embedded graph fallback.
        """
        detached_count = 0
        with self._lock:
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        "MATCH (c:ClientCall) WHERE c.id = $call_id DETACH DELETE c;",
                        {"call_id": call_id}
                    )
                    detached_count += 1
                except Exception as e:
                    logger.warning(f"Native delete_client_call error: {e}")

            # Fallback sqlite graph engine cleanup
            try:
                with sqlite3.connect(self._sqlite_path) as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "DELETE FROM graph_nodes WHERE node_type = 'ClientCall' AND id = ?;",
                        (call_id,)
                    )
                    detached_count += cur.rowcount
                    cur.execute(
                        "DELETE FROM graph_edges WHERE (from_type = 'ClientCall' AND from_id = ?) OR (to_type = 'ClientCall' AND to_id = ?);",
                        (call_id, call_id)
                    )
                    conn.commit()
            except Exception as e:
                logger.warning(f"Embedded delete_client_call fallback error: {e}")

        return {"call_id": call_id, "detached_count": max(1, detached_count)}

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
                        ON CREATE SET a.description = $description, a.owner = $owner, a.deadline = $deadline,
                                      a.status = $status, a.source_type = $stype, a.source_id = $sid,
                                      a.timestamp_offset = $offset
                        ON MATCH SET a.description = $description, a.owner = $owner, a.status = $status;
                        """,
                        {
                            "id": item_id,
                            "description": description,
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

    def sync_invariant(
        self,
        invariant_id: str,
        name: str,
        rule: str,
        rationale: str = "",
        adr_ref: str = "",
    ) -> bool:
        """Inserts or updates an Invariant rule node in the Kùzu institutional memory graph."""
        with self._lock:
            import json
            data = {
                "id": invariant_id,
                "name": name,
                "rule": rule,
                "rationale": rationale,
                "adr_ref": adr_ref,
            }
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (i:Invariant {id: $id})
                        ON CREATE SET i.name = $name, i.rule = $rule, i.rationale = $rationale, i.adr_ref = $adr_ref
                        ON MATCH SET i.name = $name, i.rule = $rule, i.rationale = $rationale, i.adr_ref = $adr_ref;
                        """,
                        {
                            "id": invariant_id,
                            "name": name,
                            "rule": rule,
                            "rationale": rationale,
                            "adr_ref": adr_ref,
                        },
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_invariant error: {e}")

            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("Invariant", invariant_id, json.dumps(data)),
                )
                conn.commit()
            return True

    def sync_code_entity(
        self,
        entity_id: str,
        file_path: str,
        symbol_name: str,
        entity_type: str = "FUNCTION",
    ) -> bool:
        """Registers a CodeEntity (function, class, endpoint) in the institutional graph."""
        with self._lock:
            import json
            data = {
                "id": entity_id,
                "file_path": file_path,
                "symbol_name": symbol_name,
                "entity_type": entity_type,
            }
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (c:CodeEntity {id: $id})
                        ON CREATE SET c.file_path = $file_path, c.symbol_name = $symbol_name, c.entity_type = $entity_type
                        ON MATCH SET c.file_path = $file_path, c.symbol_name = $symbol_name, c.entity_type = $entity_type;
                        """,
                        {
                            "id": entity_id,
                            "file_path": file_path,
                            "symbol_name": symbol_name,
                            "entity_type": entity_type,
                        },
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native sync_code_entity error: {e}")

            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_nodes (node_type, id, data) VALUES (?, ?, ?);",
                    ("CodeEntity", entity_id, json.dumps(data)),
                )
                conn.commit()
            return True

    def link_document_to_decision(self, doc_id: str, decision_id: str) -> bool:
        """Forms a [:RELATES_TO] edge from Document to Decision."""
        with self._lock:
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (doc:Document {id: $doc_id})
                        MERGE (dec:Decision {id: $decision_id})
                        MERGE (doc)-[:RELATES_TO]->(dec);
                        """,
                        {"doc_id": doc_id, "decision_id": decision_id},
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native link_document_to_decision error: {e}")

            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                    ("RELATES_TO", "Document", doc_id, "Decision", decision_id, json.dumps({})),
                )
                conn.commit()
            return True

    def link_action_to_document(self, item_id: str, doc_id: str) -> bool:
        """Forms an [:ASSIGNED_TO] edge from ActionItem to Document."""
        with self._lock:
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (a:ActionItem {id: $item_id})
                        MERGE (doc:Document {id: $doc_id})
                        MERGE (a)-[:ASSIGNED_TO]->(doc);
                        """,
                        {"item_id": item_id, "doc_id": doc_id},
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native link_action_to_document error: {e}")

            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                    ("ASSIGNED_TO", "ActionItem", item_id, "Document", doc_id, json.dumps({})),
                )
                conn.commit()
            return True

    def link_invariant_to_code(self, invariant_id: str, code_entity_id: str) -> bool:
        """Forms an [:ENFORCES] edge from Invariant to CodeEntity."""
        with self._lock:
            if self.use_native and self._conn:
                try:
                    self._conn.execute(
                        """
                        MERGE (inv:Invariant {id: $invariant_id})
                        MERGE (c:CodeEntity {id: $code_id})
                        MERGE (inv)-[:ENFORCES]->(c);
                        """,
                        {"invariant_id": invariant_id, "code_id": code_entity_id},
                    )
                    return True
                except Exception as e:
                    logger.warning(f"Native link_invariant_to_code error: {e}")

            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graph_edges (edge_type, from_type, from_id, to_type, to_id, data) VALUES (?, ?, ?, ?, ?, ?);",
                    ("ENFORCES", "Invariant", invariant_id, "CodeEntity", code_entity_id, json.dumps({})),
                )
                conn.commit()
            return True

    def get_document_decisions(self, doc_id: str) -> List[Dict[str, Any]]:
        """Finds all Decision nodes connected to a Document via [:RELATES_TO]."""
        results: List[Dict[str, Any]] = []
        with self._lock:
            if self.use_native and self._conn:
                try:
                    res = self._conn.execute(
                        """
                        MATCH (doc:Document {id: $doc_id})-[:RELATES_TO]->(dec:Decision)
                        RETURN dec.id, dec.title, dec.category, dec.status, dec.chosen_option, dec.timestamp;
                        """,
                        {"doc_id": doc_id},
                    )
                    while res.has_next():
                        row = res.get_next()
                        results.append({
                            "id": row[0],
                            "title": row[1],
                            "category": row[2],
                            "status": row[3],
                            "chosen_option": row[4],
                            "timestamp": row[5],
                        })
                    return results
                except Exception as e:
                    logger.warning(f"Native get_document_decisions error: {e}")

            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    SELECT n.data FROM graph_edges e
                    JOIN graph_nodes n ON n.node_type = 'Decision' AND n.id = e.to_id
                    WHERE e.edge_type = 'RELATES_TO' AND e.from_type = 'Document' AND e.from_id = ?;
                    """,
                    (doc_id,),
                )
                for (data_str,) in cur.fetchall():
                    results.append(json.loads(data_str))
            return results

    def get_invariants_for_code(self, code_entity_id: str) -> List[Dict[str, Any]]:
        """Finds all Invariant rules enforcing a given CodeEntity."""
        results: List[Dict[str, Any]] = []
        with self._lock:
            if self.use_native and self._conn:
                try:
                    res = self._conn.execute(
                        """
                        MATCH (inv:Invariant)-[:ENFORCES]->(c:CodeEntity {id: $code_id})
                        RETURN inv.id, inv.name, inv.rule, inv.rationale, inv.adr_ref;
                        """,
                        {"code_id": code_entity_id},
                    )
                    while res.has_next():
                        row = res.get_next()
                        results.append({
                            "id": row[0],
                            "name": row[1],
                            "rule": row[2],
                            "rationale": row[3],
                            "adr_ref": row[4],
                        })
                    return results
                except Exception as e:
                    logger.warning(f"Native get_invariants_for_code error: {e}")

            import json
            with sqlite3.connect(self._sqlite_path) as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    SELECT n.data FROM graph_edges e
                    JOIN graph_nodes n ON n.node_type = 'Invariant' AND n.id = e.from_id
                    WHERE e.edge_type = 'ENFORCES' AND e.to_type = 'CodeEntity' AND e.to_id = ?;
                    """,
                    (code_entity_id,),
                )
                for (data_str,) in cur.fetchall():
                    results.append(json.loads(data_str))
            return results

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
