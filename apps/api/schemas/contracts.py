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
    user_role: Optional[str] = None
    user_name: Optional[str] = None
    organisation_id: Optional[str] = None
    as_of: Optional[int] = None

class SearchCitation(BaseModel):
    doc_id: str
    doc_title: str
    page_number: int
    snippet: str
    source_type: Optional[str] = "DOCUMENT"
    confidence: Optional[float] = 1.0
    effective_from: Optional[int] = None
    confidence_state: Optional[str] = "CONFIRMED"
    location: Optional[str] = None
    author: Optional[str] = None
    retrieval_channels: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    rrf_score: Optional[float] = None
    relationship_path: Optional[List[str]] = Field(default_factory=list)
    is_superseded: bool = False
    superseded_by: Optional[str] = None

    @property
    def id(self) -> str:
        return self.doc_id

class SearchResponse(BaseModel):
    query: str
    answer: str
    citations: List[SearchCitation]
    latency_ms: float
    source_mode: str = "LIVE"  # LIVE | MOCK | FALLBACK | SYNTHETIC
    is_authoritative: bool = True
    status: str = "COMPLETED"  # COMPLETED | INFERENCE_UNAVAILABLE | NO_EVIDENCE | PARTIAL | ABSTAINED
    request_id: Optional[str] = None
    evidence_set: Optional[Dict[str, Any]] = None
    abstention_reason: Optional[str] = None

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
    organisation_id: str = "CMP-GENESIS-01"
    effective_from: Optional[int] = None
    effective_to: Optional[int] = None
    source_mode: str = "LIVE"
    is_authoritative: bool = True
    confidence_state: str = "CONFIRMED"
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
    company_name: Optional[str] = None

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
    action_type: str = "GENERIC"
    owner: str = "Unassigned"
    assignee: Optional[str] = None
    department: Optional[str] = "General"
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[int] = None
    status: str = "OPEN"      # OPEN, IN_PROGRESS, DONE, PENDING, APPROVED, REJECTED, PROPOSED, REVIEW_REQUIRED, QUEUED, EXECUTING, COMPLETED, FAILED, ROLLED_BACK
    source_type: str = "CALL" # CLIENT_CALL, DECISION, THINK_TANK, CALL, CHAT, ARCHITECTURE
    source_id: str = ""
    source_offset: Optional[str] = None
    source: str = "HUMAN"     # LLM_PROPOSAL, CLIENT_CALL, DECISION, HUMAN
    reason: Optional[str] = None
    evidence_ref: Optional[str] = None
    tool: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    risk_level: str = "LOW"   # LOW, MEDIUM, HIGH, CRITICAL
    approver_id: Optional[str] = None
    approved_at: Optional[int] = None
    execution_time_ms: Optional[int] = None
    rollback_handler: Optional[Dict[str, Any]] = None
    audit_block_id: Optional[str] = None
    organisation_id: str = "CMP-GENESIS-01"
    lifecycle_status: Optional[str] = "OPEN"
    effective_from: Optional[int] = None
    effective_to: Optional[int] = None
    confidence_state: str = "CONFIRMED"
    source_mode: str = "LIVE"
    is_authoritative: bool = True

from apps.api.schemas.core_contracts import (
    ActionLifecycleState,
    ActionReceipt,
    PolicyRule,
    PolicyDecision,
    FactTransitionRequest,
    FactTransitionResponse,
)

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
    organisation_id: str = "CMP-GENESIS-01"
    effective_from: Optional[int] = None
    effective_to: Optional[int] = None
    superseded_by: Optional[str] = None
    confidence_state: str = "CONFIRMED"
    source_mode: str = "LIVE"
    is_authoritative: bool = True

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

class AuditBlockDTO(BaseModel):
    event_id: str
    sequence_id: int
    timestamp: int
    actor: str
    organisation_id: str
    action: str
    source: str
    input_hash: str
    result_hash: str
    previous_hash: str
    event_hash: str
    is_valid: bool = True
    current_hash: Optional[str] = None
    sequence: Optional[int] = None

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

# ==========================================
# GENESIS ONBOARDING & INSTITUTIONAL IDENTITY
# ==========================================
class CompanyProfileDTO(BaseModel):
    """Sovereign Startup Institutional Identity contract."""
    id: str
    company_name: str
    website: Optional[str] = None
    industry: str
    stage: str
    team_size: str
    runway_months: Optional[int] = 18
    one_liner: str
    core_thesis: Optional[str] = None
    icp: Optional[str] = None
    tech_stack: Optional[str] = None
    enterprise_policy: str = "REJECT_CUSTOM_FORKS"
    pricing_model: str = "USAGE_BASED"
    tars_tone: str = "CONCISE_EXECUTIVE"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CompanyProfileCreate(BaseModel):
    """Payload for creating or updating startup identity."""
    company_name: str
    website: Optional[str] = None
    industry: str
    stage: str
    team_size: str
    runway_months: Optional[int] = 18
    one_liner: str
    core_thesis: Optional[str] = None
    icp: Optional[str] = None
    tech_stack: Optional[str] = None
    enterprise_policy: str = "REJECT_CUSTOM_FORKS"
    pricing_model: str = "USAGE_BASED"
    tars_tone: str = "CONCISE_EXECUTIVE"

class GenesisBloomRequest(BaseModel):
    """Multi-step Genesis activation payload for seeding institutional memory."""
    company_name: str
    website: Optional[str] = None
    industry: str
    stage: str
    team_size: str
    runway_months: Optional[int] = 18
    one_liner: str
    core_thesis: Optional[str] = None
    icp: Optional[str] = None
    tech_stack: Optional[str] = None
    enterprise_policy: str = "REJECT_CUSTOM_FORKS"
    pricing_model: str = "USAGE_BASED"
    tars_tone: str = "CONCISE_EXECUTIVE"
    internal_acronyms: Optional[List[Dict[str, str]]] = None
    load_sample_assets: bool = False

class GenesisBloomResponse(BaseModel):
    """Celebration and activation synthesis response."""
    status: str
    company_profile: CompanyProfileDTO
    seeded_decisions: List[str]
    flight_plans_count: int
    loaded_assets: List[str]
    nodes_bloomed: int
    timestamp: int


# ==========================================
# USER & ACCESS REGISTRY
# ==========================================
class UserCreateDTO(BaseModel):
    """Payload for registering a custom user."""
    name: str
    email: str
    role: str = "ENGINEER"
    department: Optional[str] = None
    clearance: Optional[str] = None
    company_name: Optional[str] = None
    company_id: Optional[str] = None

class UserDTO(BaseModel):
    """Persisted user representation."""
    id: str
    name: str
    email: str
    role: str
    department: str
    clearance: str
    created_at: int
    company_id: Optional[str] = None
    company_name: Optional[str] = None


# ==========================================
# WORKSPACE MANAGEMENT & DATA ISOLATION
# ==========================================
class WorkspaceResetRequest(BaseModel):
    """Configuration for resetting sovereign workspace state."""
    reset_type: str = "ALL"  # "ALL", "DEMO_ONLY", "DOCUMENTS", "ACTIONS", "DECISIONS"
    preserve_users: bool = True
    preserve_company_profile: bool = False

class WorkspaceResetResponse(BaseModel):
    """Result of workspace reset and data decoupling operation."""
    status: str
    message: str
    cleared: Dict[str, int]
    timestamp: int


# ==========================================
# COMPANY KNOWLEDGE CHATBOT (PERSISTENT SESSIONS)
# ==========================================
class ChatSessionDTO(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    is_deleted: bool = False

class ChatSessionCreate(BaseModel):
    user_id: Optional[str] = "usr-alex"
    title: Optional[str] = "New conversation"

class ChatSessionUpdate(BaseModel):
    title: str

class ChatMessageDTO(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    citations: Optional[List[SearchCitation]] = Field(default_factory=list)
    created_at: str
    is_deleted: bool = False

class ChatMessageCreate(BaseModel):
    content: str
    user_id: Optional[str] = None
    user_role: Optional[str] = "ENGINEER"
    user_name: Optional[str] = None
    clearance: Optional[str] = "ALL_TEAM"


# Canonical aliases for Phase 2 contracts
from apps.api.schemas.core_contracts import (
    EvidenceChannel,
    EvidenceItem,
    EvidenceSet,
)

# ==========================================
# WORKSPACE 3: DYNAMIC ONBOARDING FLIGHT-PLANS
# ==========================================
class OnboardingMilestoneTour(BaseModel):
    title: str
    audio_duration: str = "3m 45s"
    speaker: str = "Founder"

class OnboardingModuleDTO(BaseModel):
    id: str
    company_name: Optional[str] = None
    company_id: Optional[str] = None
    day: int
    title: str
    description: str
    tasks: List[str] = Field(default_factory=list)
    milestone_tour: Optional[OnboardingMilestoneTour] = None
    order_index: int = 0
    is_published: bool = True
    status: Optional[str] = None

class OnboardingFlightPlanDTO(BaseModel):
    company_name: str
    company_id: Optional[str] = None
    title: str
    total_days: int = 14
    current_day: int = 1
    modules: List[OnboardingModuleDTO] = Field(default_factory=list)
    completed_tasks: Dict[str, bool] = Field(default_factory=dict)
    is_published: bool = True
    updated_at: Optional[str] = None

class OnboardingFlightPlanCreate(BaseModel):
    company_name: str
    company_id: Optional[str] = None
    title: Optional[str] = None
    total_days: Optional[int] = 14
    modules: List[OnboardingModuleDTO] = Field(default_factory=list)

class OnboardingProgressUpdateDTO(BaseModel):
    company_name: str
    user_id: Optional[str] = None
    task_key: str
    completed: bool

class OnboardingResetRequest(BaseModel):
    company_name: str
    company_id: Optional[str] = None

