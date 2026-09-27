# apps/api/schemas/contracts.py
"""Frozen Contract Boundary for TARS Monorepo (Version 2.0.0)."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

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
    delay_days: int = 0
    reallocated_devs: int = 0

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
# UNIFIED ACTION HUB (FULL CRUD DTO)
# ==========================================
class ActionItemDTO(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    owner: str = "Unassigned"
    department: str = "General"
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[int] = None
    status: str = "OPEN"      # OPEN, IN_PROGRESS, DONE
    source_type: str          # CLIENT_CALL, DECISION, THINK_TANK
    source_id: str
    source_offset: Optional[str] = None

# ==========================================
# MCP INTERNAL LOOPBACK DISPATCH
# ==========================================
class MCPToolInvocation(BaseModel):
    tool: str
    args: Dict[str, Any] = Field(default_factory=dict)
