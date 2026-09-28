import { TarsApi } from './api';
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
import {
  MOCK_SEARCH_RESULTS,
  MOCK_CALLS,
  MOCK_DECISIONS,
  MOCK_CONTRADICTIONS,
  MOCK_SIMULATION_RESULT,
  MOCK_INVARIANTS,
  MOCK_ACTION_ITEMS,
} from '../mocks/fixtures';

// Helper for simulated local latency (40-100ms)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTarsApi implements TarsApi {
  private decisions: DecisionItem[] = [...MOCK_DECISIONS];
  private calls: VoiceToSpecResponse[] = [...MOCK_CALLS];
  private invariants: InvariantCheckResult[] = [...MOCK_INVARIANTS];
  private actions: ActionItemDTO[] = [...MOCK_ACTION_ITEMS];

  async search(req: SearchRequest): Promise<SearchResponse> {
    await sleep(65);
    const q = req.query.toLowerCase();
    if (q.includes('saml') || q.includes('sso') || q.includes('acme') || q.includes('commitment')) {
      return MOCK_SEARCH_RESULTS.saml;
    }
    if (req.query.trim().length === 0) {
      return {
        query: "",
        answer: "Please enter a search query to search across company documents, past decisions, client transcripts, and architectural records.",
        citations: [],
        latency_ms: 12.4
      };
    }
    return {
      ...MOCK_SEARCH_RESULTS.default,
      query: req.query,
    };
  }

  async uploadDocument(file: File): Promise<{ doc_id: string; title: string; pages: number }> {
    await sleep(250);
    return {
      doc_id: `DOC-${Date.now()}`,
      title: file.name,
      pages: 4,
    };
  }

  async getCalls(): Promise<VoiceToSpecResponse[]> {
    await sleep(50);
    return [...this.calls];
  }

  async getCall(id: string): Promise<VoiceToSpecResponse | null> {
    await sleep(40);
    return this.calls.find((c) => c.call_id === id) || null;
  }

  async uploadCallAudio(file: File): Promise<VoiceToSpecResponse> {
    await sleep(400);
    const newCall: VoiceToSpecResponse = {
      call_id: `CALL-${Date.now().toString().slice(-4)}`,
      client_name: file.name.replace(/\.[^/.]+$/, ""),
      sentiment: "URGENT",
      audio_duration_seconds: 145.0,
      recorded_at: "Just now",
      summary: "Newly ingested audio debrief processed by on-device Whisper. Context extracted into commitments.",
      pain_points: ["Manual data synchronization across remote offices."],
      feature_requests: ["Automatic daily changelog generation."],
      commitments: ["Review requirements with product engineering."],
      transcript: [
        {
          speaker: "Caller",
          timestamp: "00:05",
          seconds: 5,
          text: "We need this deployed locally by next Monday with zero cloud egress."
        }
      ]
    };
    this.calls.unshift(newCall);
    return newCall;
  }

  async uploadVoiceMemo(
    audioBlob: Blob,
    filename = "voice_memo.webm"
  ): Promise<{ task_id: string; transcript: string; duration_seconds: number }> {
    await sleep(800);
    return {
      task_id: `MEMO-${Date.now().toString().slice(-4)}`,
      transcript: "Voice memo captured locally. Evaluated against institutional memory with zero egress.",
      duration_seconds: 12.0,
    };
  }

  async getDecisions(): Promise<DecisionItem[]> {
    await sleep(45);
    return [...this.decisions];
  }

  async getDecision(id: string): Promise<DecisionItem | null> {
    await sleep(35);
    return this.decisions.find((d) => d.id === id) || null;
  }

  async checkContradiction(proposal: string, severity = "BALANCED"): Promise<ContradictionCheckResponse> {
    await sleep(80);
    const p = proposal.toLowerCase();
    if (p.includes('saml') || p.includes('custom') || p.includes('acme') || p.includes('enterprise')) {
      return {
        ...MOCK_CONTRADICTIONS.saml,
        severity,
      };
    }
    return {
      has_conflict: false,
      severity,
      conflicting_decision_id: null,
      explanation: "No direct contradiction detected with active company decisions."
    };
  }

  async simulateImpact(req: SimulationRequest): Promise<SimulationResponse> {
    await sleep(150);
    return {
      ...MOCK_SIMULATION_RESULT,
      runway_impact_months: -(req.reallocated_devs * 0.9),
      delivery_delay_weeks: +(req.delay_days / 7).toFixed(1),
    };
  }

  async recordDecision(decision: Omit<DecisionItem, 'id' | 'timestamp'>): Promise<DecisionItem> {
    await sleep(100);
    const newDec: DecisionItem = {
      ...decision,
      id: `DEC-${this.decisions.length + 10}`,
      timestamp: Date.now(),
      lifecycle_status: 'ACTIVE'
    };
    this.decisions.unshift(newDec);
    return newDec;
  }

  async getInvariants(): Promise<InvariantCheckResult[]> {
    await sleep(40);
    return [...this.invariants];
  }

  async triggerASTCheck(): Promise<{ execution_time_ms: number; results: InvariantCheckResult[] }> {
    await sleep(38); // sub-50ms execution!
    return {
      execution_time_ms: 38.4,
      results: [...this.invariants],
    };
  }

  async getActionItems(): Promise<ActionItemDTO[]> {
    await sleep(35);
    return [...this.actions];
  }

  async updateActionStatus(id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO> {
    await sleep(30);
    const item = this.actions.find((a) => a.id === id);
    if (!item) throw new Error("Action item not found");
    item.status = status;
    return { ...item };
  }

  async createActionItem(item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO> {
    await sleep(40);
    const newItem: ActionItemDTO = {
      ...item,
      id: `ACT-${Date.now().toString().slice(-3)}`
    };
    this.actions.unshift(newItem);
    return newItem;
  }
}
