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
} from '../types/contracts';

export interface TarsApi {
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

  // Central: Unified Action Hub
  getActionItems(): Promise<ActionItemDTO[]>;
  updateActionStatus(id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO>;
  createActionItem(item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO>;
}
