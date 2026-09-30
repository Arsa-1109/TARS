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


# ==========================================
# PHASE 3: GOVERNED ACTION & POLICY CONTRACTS
# ==========================================
class ActionLifecycleState:
    DETECTED = "DETECTED"
    PROPOSED = "PROPOSED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    QUEUED = "QUEUED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"

    # Legacy mapping for backwards compatibility
    LEGACY_MAP = {
        "OPEN": "PROPOSED",
        "PENDING": "REVIEW_REQUIRED",
        "IN_PROGRESS": "EXECUTING",
        "DONE": "COMPLETED",
    }

    @classmethod
    def normalize(cls, state: str) -> str:
        s = (state or "").upper().strip()
        return cls.LEGACY_MAP.get(s, s)


class ActionReceipt(BaseModel):
    receipt_id: str = Field(default_factory=lambda: f"RCP-{uuid.uuid4().hex[:8]}")
    action_id: str
    status: str  # EXECUTED | FAILED | ROLLED_BACK
    actor: str
    executed_at: int
    duration_ms: Optional[int] = 0
    parameters_hash: str
    result_summary: Optional[str] = None
    rollback_payload: Optional[Dict[str, Any]] = None
    audit_block_id: Optional[str] = None
    organisation_id: str = "CMP-GENESIS-01"


class PolicyRule(BaseModel):
    id: str
    action_type: str
    description: Optional[str] = None
    allowed_roles: List[str] = Field(default_factory=list)
    required_clearance: str = "ALL_TEAM"
    max_risk: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    requires_human: bool = True
    allowed_tools: List[str] = Field(default_factory=list)
    conditions: Dict[str, Any] = Field(default_factory=dict)
    organisation_id: str = "CMP-GENESIS-01"
    is_active: bool = True


class PolicyDecision(BaseModel):
    is_allowed: bool
    requires_human: bool
    matching_policy_id: Optional[str] = None
    denial_reasons: List[str] = Field(default_factory=list)
    audit_ref: Optional[str] = None


class FactTransitionRequest(BaseModel):
    entity_type: str  # MEMORY | DOCUMENT | GLOSSARY | DECISION
    entity_id: str
    new_state: str  # CONFIRMED | REJECTED | REVIEW_REQUIRED | SUPERSEDED
    actor: Optional[str] = "SYSTEM"
    reason: Optional[str] = None
    organisation_id: Optional[str] = "CMP-GENESIS-01"


class FactTransitionResponse(BaseModel):
    entity_id: str
    entity_type: str
    previous_state: str
    current_state: str
    audit_block_id: Optional[str] = None
    timestamp: int



