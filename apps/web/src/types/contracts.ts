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
  as_of?: number;
}

export interface SearchResponse {
  query: string;
  answer: string;
  citations: SearchCitation[];
  latency_ms: number;
}

// Persistent Company Knowledge Chatbot
export interface ChatAttachment {
  file_name: string;
  file_size?: number;
  format?: string;
  doc_id?: string;
  status: 'uploading' | 'indexed' | 'error';
  progress?: number;
  error_message?: string;
  pages?: number;
}

export interface ChatSessionDTO {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface ChatMessageDTO {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
  citations?: SearchCitation[];
  created_at: string;
  is_deleted?: boolean;
  attachment?: ChatAttachment;
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

export interface StrategicRecommendation {
  id: string;
  title: string;
  category: 'RUNWAY' | 'REVENUE' | 'VELOCITY' | 'ARCHITECTURE' | 'SECURITY' | string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  rationale: string;
  estimated_impact: string;
  actionable_steps: string[];
  supporting_citations: string[];
  sim_prompt?: string;
  sim_burn_delta?: number;
  sim_timeline_shift?: number;
  status: 'ACTIVE' | 'ACCEPTED' | 'DISMISSED' | string;
  created_at?: string;
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

export interface DecisionPatchRequest {
  title?: string;
  context?: string;
  drivers?: string[];
  chosen_option?: string;
  lifecycle_status?: 'ACTIVE' | 'SUPERSEDED' | 'REPEALED' | string;
}

export interface DecisionCreateRequest {
  id?: string;
  title: string;
  category?: 'ENGINEERING' | 'PRODUCT' | 'STRATEGY' | 'PRICING' | 'SECURITY' | string;
  context?: string;
  chosen_option?: string;
  clearance?: 'ALL_TEAM' | 'EXECUTIVE_ONLY' | string;
  drivers?: string[];
  options_considered?: string[];
}

export interface SimulationScenarioRequest {
  scenario_prompt: string;
  burn_delta_monthly?: number;
  timeline_shift_days?: number;
  devs_reallocated?: number;
}

export interface SimulationScenarioResponse {
  baseline_runway_months: number;
  simulated_runway_months: number;
  runway_delta_months: number;
  compromised_clients: Array<{ client: string; commitment: string; value: string }>;
  compromised_deliverables: Array<any>;
  strategic_narrative: string;
  pre_populated_adr: {
    title: string;
    category: string;
    context: string;
    chosen_option: string;
    drivers?: string[];
  };
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


// Unified Action Hub (Item 139: DTO Parity)
export type ActionItemStatus =
  | 'DETECTED'
  | 'PROPOSED'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'PENDING';

export interface ActionItemDTO {
  id: string;
  description: string;
  owner: string;
  assignee?: string;
  title?: string;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  department?: string;
  deadline?: number | null;
  status: ActionItemStatus;
  source_type: 'CALL' | 'DECISION' | 'CHAT' | 'ARCHITECTURE' | 'CLIENT_CALL' | string;
  source_id: string;
  source_offset?: string;
  created_at?: number | string;
  expires_at?: number | null;
  policy_version?: string;
  approval_scope?: string;
  is_demo?: number;
  organisation_id?: string;
  audit_block_id?: string | null;
}

export interface DocumentDTO {
  doc_id: string;
  filename: string;
  file_hash: string;
  department: string;
  clearance: string;
  format: string;
  file_size_bytes: number;
  page_count: number;
  table_count: number;
  character_count: number;
  ingested_at: number | string;
  is_demo?: number | boolean;
  valid_from?: number;
  valid_until?: number | null;
  organisation_id?: string;
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
  | 'decisions';

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

// Workspace 3: Dynamic Onboarding Flight-Plans
export interface OnboardingMilestoneTour {
  title: string;
  audio_duration: string;
  speaker: string;
}

export interface OnboardingModuleDTO {
  id: string;
  company_name?: string;
  company_id?: string;
  day: number;
  title: string;
  description: string;
  tasks: string[];
  milestone_tour?: OnboardingMilestoneTour;
  order_index?: number;
  is_published?: boolean;
  status?: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
}

export interface OnboardingFlightPlanDTO {
  company_name: string;
  company_id?: string;
  title: string;
  total_days: number;
  current_day: number;
  modules: OnboardingModuleDTO[];
  completed_tasks: Record<string, boolean>;
  is_published: boolean;
  updated_at?: string;
}

export interface OnboardingFlightPlanCreate {
  company_name: string;
  company_id?: string;
  title?: string;
  total_days?: number;
  modules: OnboardingModuleDTO[];
}

export interface OnboardingProgressUpdateDTO {
  company_name: string;
  user_id?: string;
  task_key: string;
  completed: boolean;
}

export interface OnboardingResetRequest {
  company_name: string;
  company_id?: string;
}

// ==========================================
// INTEGRATION-4: GOVERNED ACTION, AUDIT LEDGER, POLICY & FACT TYPES
// ==========================================
export interface ActionReceipt {
  receipt_id: string;
  action_id: string;
  status: 'EXECUTED' | 'FAILED' | 'ROLLED_BACK' | string;
  actor: string;
  executed_at: number;
  duration_ms?: number;
  parameters_hash: string;
  result_summary?: string;
  rollback_payload?: Record<string, any> | null;
  audit_block_id?: string | null;
  organisation_id: string;
}

export interface ActionTransitionRequest {
  target_status: string;
  actor_id?: string;
  actor_role?: string;
  reason?: string;
}

export interface ActionExecuteRequest {
  actor_id?: string;
  actor_role?: string;
  actor_clearance?: string;
  rollback_handler?: Record<string, any>;
}

export interface ActionRollbackRequest {
  actor_id?: string;
  reason?: string;
}

export interface AuditBlockDTO {
  event_id: string;
  sequence_id: number;
  timestamp: number;
  actor: string;
  organisation_id: string;
  action: string;
  source: string;
  input_hash: string;
  result_hash: string;
  previous_hash: string;
  event_hash: string;
  is_valid?: boolean;
  current_hash?: string | null;
  sequence?: number | null;
}

export interface AuditVerifyResponse {
  status: 'AUDIT_VALID' | 'AUDIT_INTEGRITY_FAILURE' | string;
  total_events: number;
  tip_hash: string;
  message: string;
  broken_at_sequence?: number | null;
  event_id?: string | null;
  reason?: string | null;
  expected_previous_hash?: string | null;
  stored_previous_hash?: string | null;
}

export interface UnverifiedFactDTO {
  entity_type: 'MEMORY' | 'ACTION' | 'DOCUMENT' | 'DECISION' | string;
  entity_id: string;
  title: string;
  content_preview: string;
  confidence_state: string;
  timestamp: number;
  source: string;
}

export interface FactTransitionRequest {
  entity_type: string;
  entity_id: string;
  new_state: 'CONFIRMED' | 'REJECTED' | 'REVIEW_REQUIRED' | 'SUPERSEDED' | string;
  actor?: string;
  reason?: string;
  organisation_id?: string;
}

export interface FactTransitionResponse {
  entity_id: string;
  entity_type: string;
  previous_state: string;
  current_state: string;
  audit_block_id?: string | null;
  timestamp: number;
}

export interface PolicyRule {
  id: string;
  action_type: string;
  description?: string;
  allowed_roles: string[];
  required_clearance: string;
  max_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  requires_human: boolean;
  allowed_tools: string[];
  conditions?: Record<string, any>;
  organisation_id: string;
  is_active: boolean;
}

export interface PolicyDecision {
  is_allowed: boolean;
  requires_human: boolean;
  matching_policy_id?: string | null;
  denial_reasons: string[];
  audit_ref?: string | null;
}

export interface PolicyEvaluateRequest {
  action_type: string;
  role: string;
  clearance?: string;
  risk_level?: string;
  tool?: string;
  payload?: Record<string, any>;
}



