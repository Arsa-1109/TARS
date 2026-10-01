import {
  SearchRequest,
  SearchResponse,
  VoiceToSpecResponse,
  DecisionItem,
  ContradictionCheckResponse,
  SimulationRequest,
  SimulationResponse,
  InvariantCheckResult,
  ActionItemDTO,
  CompanyProfile,
  GenesisBloomPayload,
  GenesisBloomResponse,
  OnboardingFlightPlanDTO,
  OnboardingFlightPlanCreate,
  OnboardingProgressUpdateDTO,
} from '../types/contracts';

export interface TarsApi {
  // Genesis Onboarding & Sovereign Company Profile
  getCompanyProfile(companyIdOrName?: string): Promise<CompanyProfile | null>;
  saveCompanyProfile(profile: Partial<CompanyProfile>): Promise<CompanyProfile>;
  bloomGenesis(payload: GenesisBloomPayload): Promise<GenesisBloomResponse>;
  uploadSeedDocument(file: File): Promise<{ doc_id: string; title: string; pages?: number; message?: string }>;

  // Workspace 1: Knowledge
  search(req: SearchRequest): Promise<SearchResponse>;
  uploadDocument(file: File): Promise<{ doc_id: string; title: string; pages: number }>;

  // Workspace 2: Client Calls & Voice Memo
  getCalls(): Promise<VoiceToSpecResponse[]>;
  getCall(id: string): Promise<VoiceToSpecResponse | null>;
  uploadCallAudio(file: File): Promise<VoiceToSpecResponse>;
  uploadVoiceMemo(audioBlob: Blob, filename?: string): Promise<{ task_id: string; transcript: string; duration_seconds: number }>;

  // Workspace 4 & 5: Decisions & Contradictions & Simulation
  getDecisions(): Promise<DecisionItem[]>;
  getDecision(id: string): Promise<DecisionItem | null>;
  checkContradiction(proposal: string, sensitivity?: string): Promise<ContradictionCheckResponse>;
  simulateImpact(req: SimulationRequest): Promise<SimulationResponse>;
  recordDecision(decision: Omit<DecisionItem, 'id' | 'timestamp'>): Promise<DecisionItem>;

  // Workspace 6: Tech & Architecture
  getInvariants(): Promise<InvariantCheckResult[]>;
  triggerASTCheck(): Promise<{ execution_time_ms: number; results: InvariantCheckResult[] }>;
  applyRefactor(ruleId: string): Promise<{ success: boolean; invariants: InvariantCheckResult[] }>;
  resetRefactors(): Promise<{ success: boolean; invariants: InvariantCheckResult[] }>;
  getMadr(ruleId: string): Promise<import('../types/contracts').MadrResponse>;
  simulatePreCommit(ruleId: string): Promise<import('../types/contracts').PreCommitSimulationResponse>;
  getTopology(activeRuleId?: string): Promise<import('../types/contracts').TopologyResponse>;


  // Central: Unified Action Hub
  getActionItems(): Promise<ActionItemDTO[]>;
  updateActionStatus(id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO>;
  createActionItem(item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO>;

  // User & Identity Registry
  getUsers(companyIdOrName?: string): Promise<import('../types/contracts').UserDTO[]>;
  createUser(payload: import('../types/contracts').UserCreateDTO): Promise<import('../types/contracts').UserDTO>;

  // Sovereign Workspace Management & Data Isolation
  resetWorkspace(payload?: import('../types/contracts').WorkspaceResetRequest): Promise<import('../types/contracts').WorkspaceResetResponse>;

  // Workspace 3: Dynamic Onboarding Flight-Plans
  getFlightPlan(companyName?: string, userId?: string): Promise<OnboardingFlightPlanDTO>;
  saveFlightPlan(plan: OnboardingFlightPlanCreate): Promise<OnboardingFlightPlanDTO>;
  updateTaskProgress(update: OnboardingProgressUpdateDTO): Promise<{ completed_tasks: Record<string, boolean> }>;
  resetFlightPlanDefaults(companyName: string): Promise<OnboardingFlightPlanDTO>;
}

