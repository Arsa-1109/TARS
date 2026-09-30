# apps/api/schemas/core_contracts.py
"""
Track 3: Core Storage, Chat & RBAC Contracts
Exclusive domain schema definitions for Teammate 3.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid


class ChatMessageCreate(BaseModel):
    channel_id: str
    content: str
    reply_to_id: Optional[str] = None
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None


class ChatMessageUpdate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    channel_id: str
    user_id: str
    user_name: str
    user_role: str
    content: str
    reply_to_id: Optional[str] = None
    is_edited: bool = False
    created_at: str


class ClearanceFilterRequest(BaseModel):
    query: str
    department: str
    user_clearance: str  # 'EXECUTIVE_ONLY' | 'ALL_TEAM'
    user_role: str       # 'FOUNDER' | 'ENGINEER' | 'MARKETING'


class TeachMemoryRequest(BaseModel):
    content: str = Field(..., description="Institutional fact, guideline, or corporate rule")
    category: str = Field(default="STRATEGY", description="STRATEGY | ENGINEERING | POLICY | OPERATIONS")
    clearance: str = Field(default="ALL_TEAM", description="ALL_TEAM | EXECUTIVE_ONLY")
    title: Optional[str] = None


class TeachMemoryResponse(BaseModel):
    memory_id: str
    status: str
    timestamp: str


class CoreSearchResponse(BaseModel):
    query: str
    total_hits: int
    results: List[Dict[str, Any]]
    conversational_response: Optional[str] = None
    starter_chips: Optional[List[str]] = None


# ==========================================
# CORE INVARIANT FOUNDATION CONTRACTS
# ==========================================
class FactLifecycleState:
    EXTRACTED = "EXTRACTED"
    UNVERIFIED = "UNVERIFIED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"


class BiTemporalProperties(BaseModel):
    created_at: int
    effective_from: int
    effective_to: Optional[int] = None
    superseded_by: Optional[str] = None
    superseded_at: Optional[int] = None
    source_timestamp: int
    confidence_state: str = FactLifecycleState.CONFIRMED
    source_mode: str = "LIVE"
    is_authoritative: bool = True
    organisation_id: str = "CMP-GENESIS-01"


class AuditVerifyResponse(BaseModel):
    status: str  # AUDIT_VALID | AUDIT_INTEGRITY_FAILURE
    total_events: int
    tip_hash: str
    message: str
    broken_at_sequence: Optional[int] = None
    event_id: Optional[str] = None
    reason: Optional[str] = None
    expected_previous_hash: Optional[str] = None
    stored_previous_hash: Optional[str] = None


# ==========================================
# PHASE 2: EVIDENCE & RETRIEVAL CONTRACTS
# ==========================================
class EvidenceChannel(BaseModel):
    name: str  # "bm25_lexical", "semantic_vector", "graph_traversal"
    score: float
    rank: int


class EvidenceItem(BaseModel):
    evidence_id: str
    source_document_id: str
    source_title: str
    source_type: str = "DOCUMENT"  # DOCUMENT | DECISION | COMMITMENT | POLICY | TRANSCRIPT
    location: str = "page:1"  # "page:1", "offset:102-450", "timestamp:00:14:32"
    source_timestamp: int = 0
    author: Optional[str] = "SYSTEM"
    confidence_score: float = 1.0  # Calibrated [0.0, 1.0]
    confidence_state: str = FactLifecycleState.CONFIRMED
    content_snippet: str
    retrieval_channels: List[EvidenceChannel] = Field(default_factory=list)
    rrf_score: float = 0.0
    relationship_path: List[str] = Field(default_factory=list)  # e.g. ["Document:DEC-031", "RELATES_TO", "ClientCall:CC-104"]
    is_superseded: bool = False
    superseded_by: Optional[str] = None


class EvidenceSet(BaseModel):
    evidence_set_id: str = Field(default_factory=lambda: f"EVS-{uuid.uuid4().hex[:8]}")
    query: str
    items: List[EvidenceItem]
    composite_confidence: float = 1.0
    decision_context: Optional[str] = None
    constraints_applied: List[str] = Field(default_factory=list)
    abstention_triggered: bool = False
    abstention_reason: Optional[str] = None


