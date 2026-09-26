# apps/api/ingestion/routes.py
"""
Track 3: Ingestion & Audio Intelligence API Router
Exposes endpoints for mobile voice memos, ambient drop folder inspection,
multi-format document ingestion, and the Unified Action Hub CRUD operations.
Implements specifications from SDD Section 4.3 & 7.1.
"""
import os
import shutil
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, status
from pydantic import BaseModel

from apps.api.schemas.contracts import VoiceToSpecResponse, ActionItemDTO
from apps.api.ingestion.action_hub import action_hub_repo
from apps.api.ingestion.whisper_worker import whisper_worker, WhisperTask
from apps.api.ingestion.voice_to_spec import voice_to_spec
from apps.api.ingestion.drop_watcher import drop_watcher
from apps.api.ingestion.doc_ingester import doc_ingester

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "drop"))


# Automatic hook: extract 4-part spec upon transcription completion
def _auto_spec_callback(task: WhisperTask):
    if task.transcript:
        try:
            spec = voice_to_spec.extract_spec(
                transcript=task.transcript,
                call_id=task.task_id.replace("WSP-", "CALL-"),
                client_name=task.client_name,
                audio_duration=task.duration_seconds,
                auto_create_action_items=True,
            )
            task.spec_result = spec.model_dump()
        except Exception as err:
            task.error = f"Spec extraction error: {err}"


whisper_worker.on_complete_callback = _auto_spec_callback


# ============================================================
# 1. AMBIENT WATCHER, EVENTS & STATUS (SDD 4.3)
# ============================================================
@router.get("/status")
def get_ingestion_status():
    """Returns the live status of the drop folder watcher, Whisper worker, and ingested docs."""
    return {
        "status": "online",
        "track": "Track 3: Ingestion & Audio Intelligence",
        "watcher": drop_watcher.get_status(),
        "whisper": whisper_worker.get_stats(),
        "ingested_docs_count": len(doc_ingester.ingested_hashes),
    }


@router.get("/events")
def get_recent_events():
    """Returns recent ambient file capture and transcription events for GUI notification badges."""
    return {
        "events": drop_watcher.recent_events[-20:],
        "count": len(drop_watcher.recent_events),
    }


@router.post("/watcher/start")
def start_watcher():
    """Starts the ambient drop folder watcher."""
    drop_watcher.start()
    return {"message": "Drop folder watcher started", "status": drop_watcher.get_status()}


@router.post("/watcher/scan")
def trigger_folder_scan():
    """Triggers an immediate scan over files currently sitting in the drop directory."""
    drop_watcher.scan_existing()
    return {"message": "Drop folder scanned", "status": drop_watcher.get_status()}


# ============================================================
# 2. AUDIO UPLOAD & MEMO INGESTION (SDD 7.1 /api/calls/transcribe)
# ============================================================
class MemoUploadResponse(BaseModel):
    task_id: str
    filename: str
    status: str
    message: str


@router.post("/memo", response_model=MemoUploadResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/calls/transcribe", response_model=MemoUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_memo(
    file: UploadFile = File(...),
    client_name: str = Form("Client Call"),
):
    """
    Direct audio upload endpoint for mobile memos or client call recordings (SDD 7.1).
    Saves file to local drop directory and dispatches non-blocking Whisper transcription.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename or "")[1] or ".wav"
    safe_filename = f"call_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    task_id = whisper_worker.enqueue(file_path=dest_path, client_name=client_name)

    return MemoUploadResponse(
        task_id=task_id,
        filename=file.filename or safe_filename,
        status="QUEUED",
        message="Voice memo enqueued for background transcription and 4-part spec extraction.",
    )


@router.get("/tasks/{task_id}")
def get_transcription_task(task_id: str):
    """Retrieves the status, transcript, and extracted specification of an audio task."""
    task = whisper_worker.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    return {
        "task_id": task.task_id,
        "client_name": task.client_name,
        "status": task.status,
        "duration_seconds": task.duration_seconds,
        "transcript": task.transcript,
        "spec_result": task.spec_result,
        "error": task.error,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
    }


# ============================================================
# 3. MULTI-FORMAT DOCUMENT INGESTION (SDD 2.2 & 7.1)
# ============================================================
@router.post("/upload")
@router.post("/ingest/upload")
async def upload_document(
    file: UploadFile = File(...),
    department: str = Form("GENERAL"),
):
    """
    Direct multipart document upload endpoint for PDFs, Word docs, CSVs, and markdown (SDD 7.1).
    Validates SHA-256 hash and extracts plain text.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_filename = f"doc_{uuid.uuid4().hex[:8]}_{file.filename}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_record = doc_ingester.ingest_document(dest_path, department=department)
    return {
        "status": "INGESTED",
        "doc_id": doc_record["doc_id"],
        "filename": doc_record["filename"],
        "file_hash": doc_record["file_hash"],
        "department": doc_record["department"],
        "page_count": doc_record["page_count"],
        "character_count": doc_record["character_count"],
    }


# ============================================================
# 4. VOICE-TO-SPEC EXTRACTION
# ============================================================
class ExtractSpecRequest(BaseModel):
    transcript: str
    client_name: Optional[str] = "Acme Corp"
    call_id: Optional[str] = None
    audio_duration_seconds: Optional[float] = 180.0
    auto_create_action_items: Optional[bool] = True


@router.post("/extract-spec", response_model=VoiceToSpecResponse)
def extract_spec(payload: ExtractSpecRequest):
    """
    Extracts the 4-part specification (Summary, Pain Points, Feature Requests, Commitments)
    from raw conversation text and syncs commitments into the Unified Action Hub.
    """
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")

    spec = voice_to_spec.extract_spec(
        transcript=payload.transcript,
        call_id=payload.call_id,
        client_name=payload.client_name or "Acme Corp",
        audio_duration=payload.audio_duration_seconds or 180.0,
        auto_create_action_items=payload.auto_create_action_items if payload.auto_create_action_items is not None else True,
    )
    return spec


# ============================================================
# 5. UNIFIED ACTION HUB CRUD (SDD 7.1 /api/actions/list)
# ============================================================
@router.get("/action-items", response_model=List[ActionItemDTO])
@router.get("/actions/list", response_model=List[ActionItemDTO])
def list_action_items(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, IN_PROGRESS, DONE"),
    owner: Optional[str] = Query(None, description="Filter by owner"),
    source_type: Optional[str] = Query(None, description="Filter by source: CALL, DECISION, CHAT"),
):
    """Lists all action items from the Unified Action Hub database (SDD 7.1)."""
    return action_hub_repo.list_items(status=status, owner=owner, source_type=source_type)


@router.post("/action-items", response_model=ActionItemDTO, status_code=status.HTTP_201_CREATED)
def create_action_item(item: ActionItemDTO):
    """Manually creates a new action item in the Unified Action Hub."""
    return action_hub_repo.create(item)


@router.get("/action-items/{item_id}", response_model=ActionItemDTO)
def get_action_item(item_id: str):
    """Retrieves an individual action item by ID."""
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
def update_action_item(item_id: str, updates: UpdateActionItemRequest):
    """Updates status or details of an existing action item."""
    updated = action_hub_repo.update(item_id, updates.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Action item {item_id} not found.")
    return updated


@router.delete("/action-items/{item_id}")
def delete_action_item(item_id: str):
    """Deletes an action item by ID."""
    deleted = action_hub_repo.delete(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Action item {item_id} not found.")
    return {"message": f"Action item {item_id} deleted successfully", "id": item_id}
