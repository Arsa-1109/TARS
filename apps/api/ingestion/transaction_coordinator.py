# apps/api/ingestion/transaction_coordinator.py
"""
TARS Core Invariant Foundation: Dual-Store Transactional Ingestion Coordinator
Coordinates atomic document ingestion across SQLite WAL (structured lake) and Kùzu Graph.
Enforces strict atomic rollback and compensating detachment if any downstream stage fails.
"""
import hashlib
import json
import logging
import os
import time
import uuid
from typing import Dict, Any, Optional

from apps.api.core.db import db
from apps.api.core.audit_ledger import audit_ledger
from apps.api.core.errors import TARSException, ErrorCodes
from apps.api.ingestion.markitdown_parser import markitdown_parser
from apps.api.ingestion.kuzu_sync import kuzu_sync

logger = logging.getLogger("tars.ingestion.transaction_coordinator")


class TransactionalIngestionCoordinator:
    def __init__(self):
        pass

    @staticmethod
    def compute_sha256(file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def ingest_document_atomic(
        self,
        file_path: str,
        department: str = "GENERAL",
        clearance: str = "ALL_TEAM",
        organisation_id: str = "CMP-GENESIS-01",
        actor: str = "SYSTEM_INGESTOR",
        effective_from: Optional[int] = None,
        effective_to: Optional[int] = None,
        source_mode: str = "LIVE",
        simulate_failure_at: Optional[str] = None,
        doc_record: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes multi-stage transactional document ingestion:
        Stage 1: Byte validation & SHA-256 integrity
        Stage 2: Semantic parsing (Markdown, Excel tables)
        Stage 3: SQLite primary catalog transaction
        Stage 4: Chunked semantic memory indexing
        Stage 5: Kùzu graph synchronization & relationship linking
        Stage 6: Chained SHA-256 audit block commitment
        
        If any stage fails:
        - SQLite transaction rolls back immediately
        - Kùzu graph node and relationship mutations are detached and erased
        - An audit rollback event is committed
        - A machine-readable TARSException is raised
        """
        if not os.path.exists(file_path):
            raise TARSException(
                status_code=404,
                code="FILE_NOT_FOUND",
                message=f"Document file not found at: {file_path}",
                component="ingestion",
                retryable=False,
            )

        now_ts = int(time.time())
        eff_from = effective_from or now_ts
        safe_filename = os.path.basename(file_path)
        file_hash = self.compute_sha256(file_path)
        file_size = os.path.getsize(file_path)

        # Stage 1: Parsing
        if doc_record is None:
            try:
                doc_record = markitdown_parser.parse_file(
                    file_path=file_path,
                    department=department,
                    clearance=clearance,
                )
            except Exception as parse_err:
                logger.error(f"Stage 1 parse failure for {safe_filename}: {parse_err}")
                raise TARSException(
                    status_code=422,
                    code="DOCUMENT_PARSE_FAILED",
                    message=f"Unable to parse document: {parse_err}",
                    component="markitdown",
                    retryable=False,
                )

        doc_id = doc_record["doc_id"]
        content = doc_record.get("content", "")
        preview = content[:400] + ("..." if len(content) > 400 else "")

        # Begin coordinated two-phase transaction
        conn = db.get_connection()
        sqlite_committed = False
        kuzu_synced = False

        if simulate_failure_at == "stage_pre_sql":
            raise RuntimeError("Simulated failure prior to SQL commit")

        try:
            cursor = conn.cursor()
            # Explicit SQLite transaction isolation
            cursor.execute("BEGIN IMMEDIATE;")

            # Stage 3: Store in documents table
            cursor.execute(
                """
                INSERT OR REPLACE INTO documents (
                    doc_id, filename, file_path, file_hash, department, clearance,
                    format, file_size_bytes, page_count, table_count, character_count,
                    chunk_count, content, preview, ingested_at, is_demo,
                    organisation_id, effective_from, effective_to, source_timestamp,
                    confidence_state, source_mode, is_authoritative
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc_id,
                    safe_filename,
                    file_path,
                    file_hash,
                    department,
                    clearance,
                    doc_record.get("format", "TXT"),
                    file_size,
                    doc_record.get("page_count", 1),
                    doc_record.get("table_count", 0),
                    len(content),
                    doc_record.get("chunk_count", 1),
                    content,
                    preview,
                    now_ts,
                    0,
                    organisation_id,
                    eff_from,
                    effective_to,
                    now_ts,
                    "CONFIRMED",
                    source_mode,
                    1,
                ),
            )

            # Stage 4: Store chunked semantic memories in memories table
            mem_id = f"MEM-{doc_id}"
            cursor.execute(
                """
                INSERT OR REPLACE INTO memories (
                    id, record_type, title, content, source, timestamp, tags,
                    clearance, is_demo, organisation_id, effective_from, effective_to,
                    source_timestamp, confidence_state, source_mode, is_authoritative
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    mem_id,
                    "DOCUMENT",
                    safe_filename,
                    content,
                    f"INGESTION:{doc_id}",
                    now_ts,
                    f"document,{department.lower()}",
                    clearance,
                    0,
                    organisation_id,
                    eff_from,
                    effective_to,
                    now_ts,
                    "CONFIRMED",
                    source_mode,
                    1,
                ),
            )

            if simulate_failure_at == "stage_kuzu_sync":
                raise RuntimeError("Simulated failure during Kùzu graph synchronization")

            # Stage 5: Synchronize into Kùzu Graph
            kuzu_success = kuzu_sync.sync_document(
                doc_id=doc_id,
                title=safe_filename,
                department=department,
                clearance=clearance,
                organisation_id=organisation_id,
                effective_from=eff_from,
                effective_to=effective_to,
                confidence_state="CONFIRMED",
                source_mode=source_mode,
            )
            if not kuzu_success:
                raise RuntimeError("Kùzu graph sync returned failure status")
            kuzu_synced = True

            if simulate_failure_at in ("stage_post_kuzu", "post_kuzu"):
                raise RuntimeError("Simulated failure after Kùzu sync, before audit record")

            # Commit SQLite transaction
            conn.commit()
            sqlite_committed = True

            # Stage 6: Append cryptographically chained audit event
            audit_res = audit_ledger.append_event(
                actor=actor,
                organisation_id=organisation_id,
                action="DOCUMENT_INGESTED",
                source="TRANSACTION_COORDINATOR",
                input_data={"doc_id": doc_id, "filename": safe_filename, "hash": file_hash[:16]},
                result_data={"status": "COMMITTED", "doc_id": doc_id, "kuzu_synced": True},
            )

            logger.info(f"Atomic ingestion successful for {doc_id} (Audit: {audit_res['event_id']})")

            return {
                "status": "COMMITTED",
                "doc_id": doc_id,
                "filename": safe_filename,
                "file_hash": file_hash,
                "department": department,
                "clearance": clearance,
                "format": doc_record.get("format", "TXT"),
                "file_size_bytes": file_size,
                "page_count": doc_record.get("page_count", 1),
                "table_count": doc_record.get("table_count", 0),
                "character_count": len(content),
                "preview": preview,
                "effective_from": eff_from,
                "organisation_id": organisation_id,
                "audit_event_id": audit_res["event_id"],
                "audit_block_id": audit_res["event_id"],
                "source_mode": source_mode,
                "is_authoritative": True,
            }

        except Exception as exc:
            logger.error(f"Ingestion transaction aborted for {safe_filename}. Initiating atomic rollback: {exc}")

            # Rollback SQLite transaction
            try:
                conn.rollback()
            except Exception as rb_err:
                logger.warning(f"SQLite rollback notice: {rb_err}")

            # If SQLite somehow committed before error, clean it up with compensating delete
            if sqlite_committed:
                try:
                    del_cur = conn.cursor()
                    del_cur.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))
                    del_cur.execute("DELETE FROM memories WHERE id = ? OR source = ?", (f"MEM-{doc_id}", f"INGESTION:{doc_id}"))
                    conn.commit()
                except Exception as del_err:
                    logger.warning(f"Compensating SQL cleanup notice: {del_err}")

            # Compensating detachment and delete in Kùzu Graph
            if kuzu_synced or simulate_failure_at in ("stage_post_kuzu", "post_kuzu"):
                try:
                    kuzu_sync.delete_document_atomic(doc_id)
                except Exception as kz_err:
                    logger.warning(f"Compensating Kùzu cleanup notice: {kz_err}")

            # Record audit failure & rollback block
            try:
                audit_ledger.append_event(
                    actor=actor,
                    organisation_id=organisation_id,
                    action="INGESTION_ROLLBACK",
                    source="TRANSACTION_COORDINATOR",
                    input_data={"doc_id": doc_id, "filename": safe_filename},
                    result_data={"status": "ROLLED_BACK", "reason": str(exc)},
                )
            except Exception as audit_err:
                logger.warning(f"Audit rollback logging note: {audit_err}")

            raise TARSException(
                status_code=500,
                code=ErrorCodes.INGESTION_TRANSACTION_FAILED,
                message=f"Document ingestion transaction failed and was rolled back atomically: {exc}",
                component="ingestion_coordinator",
                retryable=True,
                details={"doc_id": doc_id, "filename": safe_filename, "error": str(exc)},
            )


ingestion_coordinator = TransactionalIngestionCoordinator()
