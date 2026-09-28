// Frozen Pydantic Contracts (apps/api/schemas/contracts.py)

// Workspace 1: Knowledge Base
export interface SearchCitation {
  doc_id: string;
  doc_title: string;
  page_number: number;
  snippet: string;
}

export interface SearchRequest {
  query: string;
  department?: string;
  clearance?: string;
  user_role?: string;
  user_name?: string;
}

export interface SearchResponse {
  query: string;
  answer: string;
  citations: SearchCitation[];
  latency_ms: number;
}

// Workspace 2: Client Call Studio
export interface VoiceToSpecResponse {
  call_id: string;
  client_name: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT' | string;
  summary: string;
  pain_points: string[];
  feature_requests: string[];
  commitments: string[];
  audio_duration_seconds: number;
  recorded_at?: string;
  transcript?: {
    speaker: string;
    timestamp: string;
    seconds: number;
    text: string;
  }[];
}

// Workspace 4 & 5: Decisions & Simulation
export interface DecisionItem {
  id: string;
  title: string;
  category: 'ENGINEERING' | 'PRODUCT' | 'STRATEGY' | 'PRICING' | 'SECURITY' | string;
  context: string;
  chosen_option: string;
  timestamp: number;
  clearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY' | string;
  lifecycle_status?: 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED' | 'EXPERIMENTAL';
  superseded_by?: string;
  drivers?: string[];
  options_considered?: string[];
}

export interface ContradictionCheckResponse {
  has_conflict: boolean;
  severity: 'STRICT' | 'BALANCED' | 'RELAXED' | string;
  conflicting_decision_id: string | null;
  explanation: string | null;
}

export interface SimulationRequest {
  proposal: string;
  delay_days: number;
  reallocated_devs: number;
}

export interface SimulationResponse {
  runway_impact_months: number;
  delivery_delay_weeks: number;
  affected_client_promises: string[];
  affected_code_modules: string[];
  executive_synthesis: string;
}

// Workspace 6: Tech & Architecture
export interface InvariantCheckResult {
  is_breached: boolean;
  rule_id: string;
  rule_name: string;
  violating_file: string;
  line_number: number;
  rationale: string;
  adr_ref: string;
  suggested_refactor: string;
  observed_code?: string;
}

// Unified Action Hub
export interface ActionItemDTO {
  id: string;
  description: string;
  owner: string;
  title?: string;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  department?: string;
  deadline?: number | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  source_type: 'CALL' | 'DECISION' | 'CHAT' | 'ARCHITECTURE';
  source_id: string;
  source_offset: string;
}

// Cursor MCP Config
export interface CursorMcpConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  >;
}

// Role Profile
export type UserRole = 'FOUNDER' | 'PRODUCT' | 'SALES' | 'ENGINEER' | 'NEW_HIRE';

export interface UserProfile {
  name: string;
  role: UserRole;
  department: string;
  clearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY';
}

// Workspace Navigation
export type WorkspaceId =
  | 'knowledge'
  | 'calls'
  | 'onboarding'
  | 'thinktank'
  | 'decisions'
  | 'architecture';
