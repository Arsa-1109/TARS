# apps/api/schemas/contracts.py
from pydantic import BaseModel, Field
from typing import List, Optional

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
    client_name: str
    sentiment: str
    summary: str
    pain_points: List[str]
    feature_requests: List[str]
    commitments: List[str]
    audio_duration_seconds: float

# ==========================================
# WORKSPACE 4 & 5: DECISIONS & SIMULATION
# ==========================================
class DecisionItem(BaseModel):
    id: str
    title: str
    category: str
    context: str
    chosen_option: str
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
    affected_client_promises: List[str]
    affected_code_modules: List[str]
    executive_synthesis: str

# ==========================================
# WORKSPACE 6: TECH & CODE INVARIANTS
# ==========================================
class InvariantCheckResult(BaseModel):
    is_breached: bool
    rule_id: str
    rule_name: str
    violating_file: str
    line_number: int
    rationale: str
    adr_ref: str
    suggested_refactor: str

# ==========================================
# UNIFIED ACTION HUB
# ==========================================
class ActionItemDTO(BaseModel):
    id: str
    description: str
    owner: str
    deadline: Optional[int] = None
    status: str = "OPEN"  # OPEN, IN_PROGRESS, DONE
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

