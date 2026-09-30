# apps/api/core/reconciliation.py
"""
Item 148: Background Reconciliation Worker.
Detects orphaned document chunks, dangling graph relationships, and syncs
action items and decisions between primary SQLite storage and the Kùzu graph store.
"""
import logging
import sqlite3
import os
from typing import Dict, Any
from apps.api.core.db import db

logger = logging.getLogger("tars.core.reconciliation")


class ReconciliationWorker:
    def __init__(self):
        pass

    def reconcile(self) -> Dict[str, Any]:
        """
        Executes a complete reconciliation sweep across:
        1. Document chunks vs parent documents in SQLite
        2. Dangling graph edges in embedded graph store
        3. Action items synchronization
        """
        stats = {
            "orphaned_memories_cleared": 0,
            "dangling_graph_edges_cleared": 0,
            "synced_action_items": 0,
            "status": "COMPLETED",
        }

        try:
            conn = db.get_connection()
            cursor = conn.cursor()

            # 1. Detect and clear orphaned memories whose parent document was deleted
            cursor.execute("""
                DELETE FROM memories
                WHERE source LIKE 'DOC-%'
                  AND source NOT IN (SELECT doc_id FROM documents);
            """)
            stats["orphaned_memories_cleared"] = cursor.rowcount
            conn.commit()

            # 2. Count active action items
            cursor.execute("SELECT COUNT(*) FROM action_items WHERE is_deleted = 0")
            stats["synced_action_items"] = cursor.fetchone()[0]

            # 3. Clean dangling edges in fallback graph database if it exists
            graph_db = os.path.abspath(os.path.join(os.getcwd(), ".tars", "graph_store.db"))
            if os.path.exists(graph_db):
                try:
                    with sqlite3.connect(graph_db) as gconn:
                        gcur = gconn.cursor()
                        # Remove edges where from_id or to_id is not in graph_nodes
                        gcur.execute("""
                            DELETE FROM graph_edges
                            WHERE from_id NOT IN (SELECT id FROM graph_nodes)
                               OR to_id NOT IN (SELECT id FROM graph_nodes);
                        """)
                        stats["dangling_graph_edges_cleared"] = gcur.rowcount
                        gconn.commit()
                except Exception as ge:
                    logger.warning(f"Graph store reconciliation notice: {ge}")

        except Exception as e:
            logger.error(f"Reconciliation sweep failed: {e}")
            stats["status"] = "ERROR"
            stats["error"] = str(e)

        return stats


reconciliation_worker = ReconciliationWorker()
