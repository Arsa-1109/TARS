// Frozen Pydantic Contracts (apps/api/schemas/contracts.py)

// Workspace 1: Knowledge Base
export interface SearchCitation {
  doc_id: string;
  doc_title: string;
  page_number: number;
  snippet: string;
  section_heading?: string;
  chunk_id?: string;
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
  risk_score?: number;
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
  refactored_code?: string;
  category?: string;
  severity?: string;
  target_files?: string[];
}

export interface TopologyNode {
  id: string;
  name: string;
  layer: 'Entry' | 'Core' | 'Data' | 'Event' | string;
  x: number;
  y: number;
  file_path?: string;
  isBreached?: boolean;
  enforced_by?: string[];
}

export interface TopologyEdge {
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBreached?: boolean;
}

export interface TopologyResponse {
  active_rule_id: string;
  refactored: boolean;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  descriptions: Record<string, string>;
}

export interface PreCommitSimulationResponse {
  rule_id: string;
  git_command: string;
  execution_time_ms: number;
  target_file: string;
  is_breached: boolean;
  terminal_logs: string[];
}

export interface MadrResponse {
  rule_id: string;
  rule_name: string;
  file_name: string;
  path: string;
  content: string;
  problem_statement: string;
  decision_outcome: string;
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
  id?: string;
  name: string;
  email?: string;
  role: UserRole;
  department: string;
  clearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY';
  created_at?: number;
  company_id?: string;
  company_name?: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  clearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY';
  created_at: number;
  company_id?: string;
  company_name?: string;
}

export interface UserCreateDTO {
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  clearance?: string;
  company_name?: string;
  company_id?: string;
}

// Workspace Navigation
export type WorkspaceId =
  | 'knowledge'
  | 'calls'
  | 'onboarding'
  | 'thinktank'
  | 'decisions'
  | 'architecture';

// Genesis Onboarding & Sovereign Company Profile
export interface CompanyProfile {
  id: string;
  company_name: string;
  website?: string;
  industry: string;
  stage: string;
  team_size: string;
  runway_months?: number;
  one_liner: string;
  core_thesis?: string;
  icp?: string;
  tech_stack?: string;
  enterprise_policy?: 'REJECT_CUSTOM_FORKS' | 'CASE_BY_CASE' | 'OPEN_CUSTOMISATION' | string;
  pricing_model?: 'USAGE_BASED' | 'FLAT_SEAT_BASED' | 'ENTERPRISE_TIERED' | 'OPEN_CORE' | string;
  tars_tone?: 'CONCISE_EXECUTIVE' | 'SOCRATIC_MENTOR' | 'DEVILS_ADVOCATE' | string;
  created_at?: string;
  updated_at?: string;
}

export interface GenesisBloomPayload {
  company_name: string;
  website?: string;
  industry: string;
  stage: string;
  team_size: string;
  runway_months?: number;
  one_liner: string;
  core_thesis?: string;
  icp?: string;
  tech_stack?: string;
  enterprise_policy?: string;
  pricing_model?: string;
  tars_tone?: string;
  internal_acronyms?: { term: string; definition: string }[];
  load_sample_assets?: boolean;
}

export interface GenesisBloomResponse {
  status: string;
  company_profile: CompanyProfile;
  seeded_decisions: string[];
  flight_plans_count: number;
  loaded_assets: string[];
  nodes_bloomed: number;
  timestamp: number;
}

export interface WorkspaceResetRequest {
  reset_type?: 'ALL' | 'DEMO_ONLY' | 'DOCUMENTS' | 'ACTIONS' | 'DECISIONS';
  preserve_users?: boolean;
  preserve_company_profile?: boolean;
}

export interface WorkspaceResetResponse {
  status: string;
  message: string;
  cleared: Record<string, number>;
  timestamp: number;
}

