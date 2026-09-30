# apps/api/schemas/ingestion_contracts.py
"""
Track 2: Ingestion & Call Studio Contracts
Exclusive domain schema definitions for Teammate 2.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class AudioTranscriptionEvent(BaseModel):
    call_id: str
    client_name: str
    audio_path: str
    duration_seconds: float
    transcript_text: str


class VerbalCommitmentItem(BaseModel):
    commitment_text: str
    speaker: str
    timestamp_offset: str
    promoted_action_id: Optional[str] = None


class CallDeleteRequest(BaseModel):
    delete_task_ids: Optional[List[str]] = Field(
        default=None,
        description="Selective Action Hub task IDs to delete alongside the call recording"
    )


class CallDeleteResponse(BaseModel):
    call_id: str
    deleted_at: str
    files_unlinked: bool
    graph_nodes_detached: int
    deleted_task_ids: List[str] = Field(default_factory=list)
    retained_task_ids: List[str] = Field(default_factory=list)
    status: str = "DELETED"
