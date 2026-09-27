# apps/api/schemas/contracts.py
"""
TARS: Contract-First Frozen Schemas
Shared contract definitions for all 4 tracks. Frozen across all contributors.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

# ==========================================
# WORKSPACE 1: UNIVERSAL KNOWLEDGE BASE
# ==========================================
class SearchRequest(BaseModel):
    query: str
    department: Optional[str] = "ALL"
    clearance: str = "ALL_TEAM"

class SearchCitation(BaseModel):
    doc_id: str
    doc_title: str
    page_number: int
    snippet: str

class SearchResponse(BaseModel):
    query: str
    answer: str
    citations: List[SearchCitation]
    latency_ms: float

# ==========================================
# WORKSPACE 2: CLIENT CALL STUDIO
# ==========================================
class VoiceToSpecResponse(BaseModel):
    call_id: str
    action_items: List[str]
    detected_constraints: List[str]
    scope_creeping_warnings: List[str]
    commitments: List[str]
    audio_duration_seconds: float

# ==========================================
# WORKSPACE 4 & 5: DECISIONS & SIMULATION
# ==========================================
class DecisionItem(BaseModel):
    id: str
    title: str
    rationale: str
    department: str
    timestamp: int
    clearance: str = "ALL_TEAM"

class ContradictionCheckResponse(BaseModel):
    has_conflict: bool
    severity: str  # STRICT, BALANCED, RELAXED
    conflicting_decision_id: Optional[str] = None
    explanation: Optional[str] = None

class SimulationRequest(BaseModel):
    proposal: str
    delay_days: int
    reallocated_devs: int

class SimulationResponse(BaseModel):
    runway_impact_months: float
    delivery_delay_weeks: float
    risk_score: float
    affected_code_modules: List[str]
    executive_synthesis: str

# ==========================================
# WORKSPACE 6: TECH & CODE INVARIANTS
# ==========================================
class InvariantCheckResult(BaseModel):
    file_path: str
    invariant_id: str
    line_number: int
    rationale: str
    adr_ref: str
    suggested_refactor: str

# ==========================================
# UNIFIED ACTION HUB
# ==========================================
class ActionItemDTO(BaseModel):
    id: str
    title: str
    assignee: str
    priority: str  # HIGH, MEDIUM, LOW
    status: str    # PENDING, APPROVED, REJECTED
    source_type: str  # CALL, DECISION, CHAT
    source_id: str
    source_offset: str

# ==========================================
# CONTRIBUTOR 1: MEMORY & ACTION INFRASTRUCTURE
# ==========================================
class MemoryRecord(BaseModel):
    id: str
    record_type: str
    title: str
    content: str
    source: str
    timestamp: int
    tags: List[str] = Field(default_factory=list)
    related_ids: List[str] = Field(default_factory=list)
    vector_ref: Optional[str] = None

class ToolExecutionRequest(BaseModel):
    tool_name: str
    arguments: dict
    session_id: str

class ToolAuditRecord(BaseModel):
    id: str
    tool_name: str
    arguments: dict
    actor: str
    timestamp: int
    approval_state: str
    result: Optional[str] = None
    error: Optional[str] = None

class SystemStatus(BaseModel):
    status: str
    database: str
    ollama: str
    mcp_tools: int
    airplane_mode: bool
