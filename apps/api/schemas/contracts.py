# apps/api/schemas/contracts.py
"""
TARS: Contract-First Frozen Schemas (Version 2.0.0)
Shared contract definitions for all 4 tracks. Frozen across all contributors.
"""
from typing import List, Optional, Dict, Any
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
    client_name: str = "Enterprise Client"
    sentiment: str = "NEUTRAL"
    summary: str = "Call summary pending."
    pain_points: List[str] = Field(default_factory=list)
    feature_requests: List[str] = Field(default_factory=list)
    commitments: List[str] = Field(default_factory=list)
    audio_duration_seconds: float = 0.0
    action_items: List[str] = Field(default_factory=list)
    detected_constraints: List[str] = Field(default_factory=list)
    scope_creeping_warnings: List[str] = Field(default_factory=list)

# ==========================================
# WORKSPACE 4 & 5: DECISIONS & SIMULATION
# ==========================================
class DecisionItem(BaseModel):
    id: str
    title: str
    category: str = "ENGINEERING"
    context: str = ""
    chosen_option: str = ""
    rationale: Optional[str] = None
    department: Optional[str] = None
    timestamp: int
    clearance: str = "ALL_TEAM"
    lifecycle_status: Optional[str] = "ACTIVE"
    superseded_by: Optional[str] = None
    drivers: List[str] = Field(default_factory=list)
    options_considered: List[str] = Field(default_factory=list)

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
    risk_score: Optional[float] = 0.0
    affected_client_promises: List[str] = Field(default_factory=list)
    affected_code_modules: List[str] = Field(default_factory=list)
    executive_synthesis: str = ""

# ==========================================
# WORKSPACE 6: TECH & CODE INVARIANTS
# ==========================================
class InvariantCheckResult(BaseModel):
    is_breached: bool = True
    rule_id: str = ""
    rule_name: str = ""
    violating_file: str = ""
    line_number: int = 0
    rationale: str = ""
    adr_ref: str = ""
    suggested_refactor: str = ""
    file_path: Optional[str] = None
    invariant_id: Optional[str] = None
    observed_code: Optional[str] = None

# ==========================================
# UNIFIED ACTION HUB
# ==========================================
class ActionItemDTO(BaseModel):
    id: str
    description: str = ""
    title: Optional[str] = None
    owner: str = "Unassigned"
    assignee: Optional[str] = None
    department: Optional[str] = "General"
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[int] = None
    status: str = "OPEN"      # OPEN, IN_PROGRESS, DONE, PENDING, APPROVED, REJECTED
    source_type: str = "CALL" # CLIENT_CALL, DECISION, THINK_TANK, CALL, CHAT, ARCHITECTURE
    source_id: str = ""
    source_offset: Optional[str] = None

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

# ==========================================
# CONTRIBUTOR 2: MCP INTERNAL LOOPBACK DISPATCH
# ==========================================
class MCPToolInvocation(BaseModel):
    tool: str
    args: Dict[str, Any] = Field(default_factory=dict)
