# apps/api/ingestion/routes.py
"""
Track 3: Ingestion & Audio Intelligence API Router (TARS v2.0.0)
Exposes endpoints for:
- Multi-format document ingestion & Excel table flattening (MarkitdownParser)
- Ambient drop folder watcher & real-time events (AmbientDropWatcher)
- CPU-pinned speech-to-text transcription (WhisperTranscriber - Patch P-03)
- Sub-second Voice-to-Spec 4-part extraction with XML framing (VoiceToSpecExtractor - Patch P-08, P-06)
- Institutional memory & temporal graph traversal (KuzuGraphEngine - SDD 3.1)
"""
import asyncio
import json
import logging
import os
import shutil
import threading
import time
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from apps.api.schemas.contracts import VoiceToSpecResponse, ActionItemDTO
from apps.api.ingestion.markitdown_parser import markitdown_parser
from apps.api.ingestion.whisper_transcriber import whisper_transcriber, WhisperTask
from apps.api.ingestion.spec_extractor import spec_extractor
from apps.api.ingestion.drop_watcher import drop_watcher
from apps.api.ingestion.kuzu_sync import kuzu_sync
from apps.api.ingestion.action_hub import action_hub_repo

logger = logging.getLogger("tars.ingestion.routes")
router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "drop"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


class SSEEventManager:
    """Manages Server-Sent Events subscribers and event fan-out for the ingestion pipeline."""

    def __init__(self):
        self._subscribers: List[asyncio.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        with self._lock:
            self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)

    def publish(self, event_type: str, data: Dict[str, Any]):
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": time.time(),
        }
        with self._lock:
            for q in list(self._subscribers):
                try:
                    q.put_nowait(payload)
                except (asyncio.QueueFull, Exception):
                    pass


sse_manager = SSEEventManager()

# Instrument drop watcher and whisper transcriber hooks to broadcast via SSE
_orig_drop_cb = drop_watcher.handler.on_event_callback


def _instrumented_drop_cb(event_data: Dict[str, Any]):
    if _orig_drop_cb:
        try:
            _orig_drop_cb(event_data)
        except Exception:
            pass
    sse_manager.publish(event_data.get("event", "DROP_EVENT"), event_data)


drop_watcher.handler.on_event_callback = _instrumented_drop_cb

_orig_whisper_hook = whisper_transcriber.on_complete_callback


def _instrumented_whisper_hook(task: WhisperTask):
    if _orig_whisper_hook:
        try:
            _orig_whisper_hook(task)
        except Exception:
            pass
    sse_manager.publish(
        "TRANSCRIPTION_COMPLETED",
        {
            "task_id": task.task_id,
            "status": task.status,
            "sentiment": task.spec_result.get("sentiment") if task.spec_result else "UNKNOWN",
        },
    )


whisper_transcriber.on_complete_callback = _instrumented_whisper_hook


# ============================================================
# 1. AMBIENT WATCHER, EVENTS & STATUS (SDD 4.3)
# ============================================================
@router.get("/status")
def get_ingestion_status():
    """Returns the live status of the drop folder watcher, Whisper worker, Markitdown and Kùzu graph."""
    return {
        "status": "online",
        "track": "Track 3: Ingestion & Audio Intelligence",
        "watcher": drop_watcher.get_status(),
        "whisper": whisper_transcriber.get_stats(),
        "graph": kuzu_sync.get_stats(),
        "ingested_docs_count": len(markitdown_parser.ingested_hashes),
    }


@router.get("/events")
def get_recent_events():
    """Returns recent ambient file capture and transcription events for GUI notification badges."""
    return {
        "events": drop_watcher.recent_events[-20:],
        "count": len(drop_watcher.recent_events),
    }


@router.get("/events/stream")
@router.get("/api/ingestion/events/stream")
async def stream_ingestion_events(limit: Optional[int] = Query(None, description="Optional max events to receive before closing stream")):
    """
    Real-time Server-Sent Events (SSE) stream for ingestion, transcription,
    and institutional memory updates (SDD Section 4.3).
    Supports optional ?limit=N for bounded stream consumption.
    """
    queue = sse_manager.subscribe()

    async def event_generator():
        sent_count = 0
        try:
            # Emit initial connection handshake
            init_msg = {
                "event": "CONNECTED",
                "data": {"message": "TARS v2.0.0 Tri-Modal Ingestion SSE Stream Active"},
                "timestamp": time.time(),
            }
            yield f"event: message\ndata: {json.dumps(init_msg)}\n\n"
            sent_count += 1
            if limit is not None and sent_count >= limit:
                return

            while True:
                try:
                    # Wait for next event or pulse a heartbeat
                    msg = await asyncio.wait_for(queue.get(), timeout=5.0)
                    yield f"event: {msg.get('event', 'message')}\ndata: {json.dumps(msg)}\n\n"
                    sent_count += 1
                    if limit is not None and sent_count >= limit:
                        return
                except asyncio.TimeoutError:
                    heartbeat = {
                        "event": "HEARTBEAT",
                        "data": {"status": "alive"},
                        "timestamp": time.time(),
                    }
                    yield f": heartbeat\ndata: {json.dumps(heartbeat)}\n\n"
                    sent_count += 1
                    if limit is not None and sent_count >= limit:
                        return
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            sse_manager.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/qos/pause")
def pause_ingestion_qos():
    """
    QoS Priority 3 yield: Pauses whisper transcription and ambient drop processing
    to protect active query / reasoning SLAs (SDD Patch P-09).
    """
    whisper_transcriber.pause()
    drop_watcher.pause()
    return {
        "status": "PAUSED",
        "qos_tier": "Priority 3 (Yielding)",
        "whisper_paused": whisper_transcriber.is_paused,
        "watcher_paused": drop_watcher.is_paused,
        "message": "Ingestion workers paused under QoS Priority 3 SLA guarantee.",
    }


@router.post("/qos/resume")
def resume_ingestion_qos():
    """
    QoS Priority 3 resume: Resumes whisper worker and ambient drop monitoring.
    """
    whisper_transcriber.resume()
    drop_watcher.resume()
    return {
        "status": "ACTIVE",
        "qos_tier": "Priority 3 (Active)",
        "whisper_paused": whisper_transcriber.is_paused,
        "watcher_paused": drop_watcher.is_paused,
        "message": "Ingestion workers resumed under QoS Priority 3.",
    }


@router.get("/qos/status")
def get_qos_status():
    """Returns current QoS Priority 3 pause/resume states."""
    return {
        "qos_tier": "Priority 3 (Batch Ingestion)",
        "is_paused": whisper_transcriber.is_paused or drop_watcher.is_paused,
        "whisper_paused": whisper_transcriber.is_paused,
        "watcher_paused": drop_watcher.is_paused,
    }


@router.post("/watcher/start")
def start_watcher():
    """Starts the ambient drop folder watcher."""
    drop_watcher.start()
    return {"message": "Drop folder watcher started", "status": drop_watcher.get_status()}


@router.post("/watcher/scan")
def trigger_folder_scan():
    """Triggers an immediate scan over files currently sitting in the drop directory."""
    scanned_count = drop_watcher.scan_existing()
    return {
        "message": f"Drop folder scan complete. {scanned_count} files processed.",
        "status": drop_watcher.get_status(),
    }


# ============================================================
# 2. DOCUMENT INGESTION & EXCEL FLATTENING (Markitdown)
# ============================================================
class DocumentIngestResponse(BaseModel):
    status: str = "INGESTED"
    doc_id: str
    filename: str
    file_hash: str
    department: str
    format: str
    file_size_bytes: int
    page_count: int
    table_count: int
    character_count: int
    preview: str


@router.post("/upload", response_model=DocumentIngestResponse, status_code=status.HTTP_201_CREATED)
@router.post("/ingest/upload", response_model=DocumentIngestResponse, status_code=status.HTTP_200_OK)
@router.post("/documents/upload", response_model=DocumentIngestResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    department: str = Form("GENERAL"),
    clearance: str = Form("ALL_TEAM"),
):
    """
    Uploads and parses a document (.pdf, .docx, .xlsx, .pptx, .csv, .json, .txt, .md).
    Flattens multi-sheet spreadsheets into semantic Markdown tables.
    Registers document into the Kùzu graph database.
    """
    safe_filename = os.path.basename(file.filename or f"upload_{uuid.uuid4().hex[:6]}.bin")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        doc_record = markitdown_parser.parse_file(
            file_path=file_path,
            department=department,
            clearance=clearance,
        )

        # Synchronize to Kùzu graph
        kuzu_sync.sync_document(
            doc_id=doc_record["doc_id"],
            title=safe_filename,
            department=department,
            clearance=clearance,
        )

        # Notify via SSE event stream
        sse_manager.publish(
            "DOCUMENT_INGESTED",
            {
                "doc_id": doc_record["doc_id"],
                "filename": safe_filename,
                "table_count": doc_record.get("table_count", 0),
                "chunk_count": doc_record.get("chunk_count", 0),
            },
        )

        preview = doc_record["content"][:400] + ("..." if len(doc_record["content"]) > 400 else "")

        return DocumentIngestResponse(
            doc_id=doc_record["doc_id"],
            filename=doc_record["filename"],
            file_hash=doc_record["file_hash"],
            department=doc_record["department"],
            format=doc_record["format"],
            file_size_bytes=doc_record["file_size_bytes"],
            page_count=doc_record["page_count"],
            table_count=doc_record["table_count"],
            character_count=doc_record["character_count"],
            preview=preview,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document parsing failed: {e}")


@router.get("/documents")
def list_ingested_documents():
    """Lists all documents processed by Markitdown in this session."""
    return {
        "documents": list(markitdown_parser.ingested_hashes.values()),
        "total": len(markitdown_parser.ingested_hashes),
    }


@router.get("/documents/{filename}/file")
def get_document_file(filename: str):
    """Serves raw document files for the inbuilt PDF/doc viewer."""
    import urllib.parse
    decoded_name = urllib.parse.unquote(filename)
    safe_filename = os.path.basename(decoded_name)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Fuzzy match if exact file doesn't exist
    if not os.path.exists(file_path):
        candidates = [
            safe_filename,
            safe_filename.replace(" ", "_"),
            safe_filename.replace("_", " "),
        ]
        found = False
        for cand in candidates:
            cand_path = os.path.join(UPLOAD_DIR, cand)
            if os.path.exists(cand_path):
                file_path = cand_path
                safe_filename = cand
                found = True
                break

        if not found and os.path.exists(UPLOAD_DIR):
            # Case insensitive check
            lower_name = safe_filename.lower()
            for existing in os.listdir(UPLOAD_DIR):
                if existing.lower() == lower_name:
                    file_path = os.path.join(UPLOAD_DIR, existing)
                    safe_filename = existing
                    found = True
                    break

        if not found:
            raise HTTPException(status_code=404, detail="Document file not found")

    media_type = "application/pdf" if safe_filename.lower().endswith(".pdf") else "text/plain"
    return FileResponse(
        file_path,
        media_type=media_type,
        content_disposition_type="inline",
        filename=safe_filename,
    )


# ============================================================
# 3. AUDIO TRANSCRIPTION & CLIENT CALL STUDIO (SDD 7.1)
# ============================================================
class AudioUploadResponse(BaseModel):
    task_id: str
    filename: str
    status: str
    client_name: str
    message: str


@router.post("/memo", response_model=AudioUploadResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/calls/transcribe", response_model=AudioUploadResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/calls/upload", response_model=AudioUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_audio_memo(
    file: UploadFile = File(...),
    client_name: str = Form("Enterprise Client"),
):
    """
    Receives call audio or transcript file (.wav, .mp3, .m4a, .vtt, .srt) and enqueues
    for CPU Faster-Whisper transcription (Patch P-03, 0.00 MB VRAM).
    """
    safe_filename = os.path.basename(file.filename or f"call_{uuid.uuid4().hex[:6]}.wav")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    task_id = whisper_transcriber.enqueue(file_path, client_name=client_name)

    # Broadcast via SSE
    sse_manager.publish(
        "AUDIO_QUEUED",
        {
            "task_id": task_id,
            "filename": safe_filename,
            "client_name": client_name,
        },
    )

    return AudioUploadResponse(
        task_id=task_id,
        filename=safe_filename,
        status="QUEUED",
        client_name=client_name,
        message=f"Audio enqueued for CPU transcription task {task_id}",
    )


@router.get("/calls/{task_id}")
def get_call_task_status(task_id: str):
    """Retrieves transcription progress and auto-extracted 4-part Voice-to-Spec payload."""
    task = whisper_transcriber.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Audio task '{task_id}' not found.")
    return task.to_dict()


@router.get("/calls")
def list_call_tasks():
    """Lists all queued, processing, and completed audio calls."""
    tasks = whisper_transcriber.list_tasks()
    return {
        "calls": [t.to_dict() for t in tasks],
        "total": len(tasks),
    }


# ============================================================
# 4. SUB-SECOND VOICE-TO-SPEC EXTRACTION (Patch P-08, P-06)
# ============================================================
class ExtractSpecRequest(BaseModel):
    transcript: str
    client_name: Optional[str] = "Acme Corp"
    call_id: Optional[str] = None
    audio_duration_seconds: Optional[float] = 180.0
    sync_to_graph: Optional[bool] = True


@router.post("/extract-spec", response_model=VoiceToSpecResponse)
@router.post("/spec/extract", response_model=VoiceToSpecResponse)
def extract_spec_endpoint(payload: ExtractSpecRequest):
    """
    Directly extracts the 4-part specification from text transcript using qwen3:1.7b and XML framing.
    Synchronizes ClientCall and ActionItem entities into the Kùzu graph.
    """
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")

    spec = spec_extractor.extract_spec(
        transcript=payload.transcript,
        call_id=payload.call_id,
        client_name=payload.client_name or "Acme Corp",
        audio_duration=payload.audio_duration_seconds or 180.0,
        sync_to_graph=payload.sync_to_graph if payload.sync_to_graph is not None else True,
    )
    return spec


# ============================================================
# 5. KÙZU GRAPH INSTITUTIONAL MEMORY & SUPERSEDES TRAVERSAL
# ============================================================
@router.get("/graph/stats")
def get_graph_stats():
    """Returns node and relationship statistics from Kùzu columnar graph database."""
    return kuzu_sync.get_stats()


class SyncDecisionRequest(BaseModel):
    decision_id: str
    title: str
    category: Optional[str] = "ARCHITECTURE"
    status: Optional[str] = "ACTIVE"
    context: Optional[str] = ""
    chosen_option: Optional[str] = ""
    supersedes_id: Optional[str] = None
    supersedes_reason: Optional[str] = None


@router.post("/graph/sync/decision")
def sync_decision_node(req: SyncDecisionRequest):
    """Inserts a decision and optionally forms a temporal [:SUPERSEDES] edge."""
    success = kuzu_sync.sync_decision(
        decision_id=req.decision_id,
        title=req.title,
        category=req.category or "ARCHITECTURE",
        status=req.status or "ACTIVE",
        context=req.context or "",
        chosen_option=req.chosen_option or "",
        supersedes_id=req.supersedes_id,
        supersedes_reason=req.supersedes_reason,
    )
    return {
        "status": "success" if success else "failed",
        "decision_id": req.decision_id,
        "supersedes_id": req.supersedes_id,
    }


@router.get("/graph/superseded/{decision_id}")
def get_superseded_chain(decision_id: str):
    """Traverses temporal [:SUPERSEDES*] chain to trace decision history."""
    chain = kuzu_sync.get_superseded_chain(decision_id)
    return {
        "decision_id": decision_id,
        "superseded_chain": chain,
        "chain_length": len(chain),
    }


class SyncInvariantRequest(BaseModel):
    invariant_id: str
    name: str
    rule: str
    rationale: Optional[str] = ""
    adr_ref: Optional[str] = ""


class SyncCodeEntityRequest(BaseModel):
    entity_id: str
    file_path: str
    symbol_name: str
    entity_type: Optional[str] = "FUNCTION"


class LinkDocDecisionRequest(BaseModel):
    doc_id: str
    decision_id: str


class LinkActionDocRequest(BaseModel):
    item_id: str
    doc_id: str


class LinkInvariantCodeRequest(BaseModel):
    invariant_id: str
    code_entity_id: str


@router.post("/graph/sync/invariant")
def sync_invariant_endpoint(req: SyncInvariantRequest):
    """Registers an architectural invariant rule in the institutional graph."""
    success = kuzu_sync.sync_invariant(
        invariant_id=req.invariant_id,
        name=req.name,
        rule=req.rule,
        rationale=req.rationale or "",
        adr_ref=req.adr_ref or "",
    )
    return {"status": "success" if success else "failed", "invariant_id": req.invariant_id}


@router.post("/graph/sync/code-entity")
def sync_code_entity_endpoint(req: SyncCodeEntityRequest):
    """Registers a code symbol or file in the institutional graph."""
    success = kuzu_sync.sync_code_entity(
        entity_id=req.entity_id,
        file_path=req.file_path,
        symbol_name=req.symbol_name,
        entity_type=req.entity_type or "FUNCTION",
    )
    return {"status": "success" if success else "failed", "entity_id": req.entity_id}


@router.post("/graph/link/document-decision")
def link_document_decision(req: LinkDocDecisionRequest):
    """Forms a [:RELATES_TO] edge from Document to Decision."""
    success = kuzu_sync.link_document_to_decision(req.doc_id, req.decision_id)
    return {
        "status": "success" if success else "failed",
        "relationship": "RELATES_TO",
        "doc_id": req.doc_id,
        "decision_id": req.decision_id,
    }


@router.post("/graph/link/action-document")
def link_action_document(req: LinkActionDocRequest):
    """Forms an [:ASSIGNED_TO] edge from ActionItem to Document."""
    success = kuzu_sync.link_action_to_document(req.item_id, req.doc_id)
    return {
        "status": "success" if success else "failed",
        "relationship": "ASSIGNED_TO",
        "item_id": req.item_id,
        "doc_id": req.doc_id,
    }


@router.post("/graph/link/invariant-code")
def link_invariant_code(req: LinkInvariantCodeRequest):
    """Forms an [:ENFORCES] edge from Invariant to CodeEntity."""
    success = kuzu_sync.link_invariant_to_code(req.invariant_id, req.code_entity_id)
    return {
        "status": "success" if success else "failed",
        "relationship": "ENFORCES",
        "invariant_id": req.invariant_id,
        "code_entity_id": req.code_entity_id,
    }


@router.get("/graph/document/{doc_id}/decisions")
def get_document_decisions_endpoint(doc_id: str):
    """Retrieves all Decision nodes linked to a Document via [:RELATES_TO]."""
    decisions = kuzu_sync.get_document_decisions(doc_id)
    return {"doc_id": doc_id, "decisions": decisions, "count": len(decisions)}


@router.get("/graph/code/{code_entity_id}/invariants")
def get_code_invariants_endpoint(code_entity_id: str):
    """Retrieves all Invariant rules enforcing a CodeEntity via [:ENFORCES]."""
    invariants = kuzu_sync.get_invariants_for_code(code_entity_id)
    return {"code_entity_id": code_entity_id, "invariants": invariants, "count": len(invariants)}


# ============================================================
# 6. UNIFIED ACTION HUB COMPATIBILITY ENDPOINTS (SDD 7.1)
# ============================================================
@router.get("/action-items", response_model=List[ActionItemDTO])
@router.get("/actions/list", response_model=List[ActionItemDTO])
@router.get("/actions", response_model=List[ActionItemDTO])
def list_action_items(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, IN_PROGRESS, DONE"),
    owner: Optional[str] = Query(None, description="Filter by owner"),
    source_type: Optional[str] = Query(None, description="Filter by source: CALL, DECISION, CHAT"),
):
    return action_hub_repo.list_items(status=status, owner=owner, source_type=source_type)


@router.post("/action-items", response_model=ActionItemDTO, status_code=status.HTTP_201_CREATED)
@router.post("/actions", response_model=ActionItemDTO, status_code=status.HTTP_201_CREATED)
def create_action_item(item: ActionItemDTO):
    return action_hub_repo.create(item)


@router.get("/action-items/{item_id}", response_model=ActionItemDTO)
@router.get("/actions/{item_id}", response_model=ActionItemDTO)
def get_action_item(item_id: str):
    item = action_hub_repo.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Action item {item_id} not found.")
    return item


class UpdateActionItemRequest(BaseModel):
    description: Optional[str] = None
    owner: Optional[str] = None
    deadline: Optional[int] = None
    status: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    source_offset: Optional[str] = None


@router.patch("/action-items/{item_id}", response_model=ActionItemDTO)
@router.patch("/actions/{item_id}", response_model=ActionItemDTO)
def update_action_item(item_id: str, updates: UpdateActionItemRequest):
    updated = action_hub_repo.update(item_id, updates.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Action item {item_id} not found.")
    return updated


@router.delete("/action-items/{item_id}")
@router.delete("/actions/{item_id}")
def delete_action_item(item_id: str):
    deleted = action_hub_repo.delete(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Action item {item_id} not found.")
    return {"message": f"Action item {item_id} deleted successfully", "id": item_id}
