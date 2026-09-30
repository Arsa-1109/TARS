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
  CompanyProfile,
  GenesisBloomPayload,
  GenesisBloomResponse,
} from '../types/contracts';
import {
  MOCK_SEARCH_RESULTS,
  MOCK_CALLS,
  MOCK_DECISIONS,
  MOCK_CONTRADICTIONS,
  MOCK_SIMULATION_RESULT,
  MOCK_INVARIANTS,
  MOCK_ACTION_ITEMS,
  MOCK_PRECOMMIT_SIMULATIONS,
  MOCK_TOPOLOGY,
} from '../mocks/fixtures';
import {
  TopologyResponse,
  PreCommitSimulationResponse,
  MadrResponse,
} from '../types/contracts';


// Helper for simulated local latency (40-100ms)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTarsApi implements TarsApi {
  private companyProfile: CompanyProfile | null = {
    id: 'CMP-GENESIS-01',
    company_name: 'AetherFlow AI',
    website: 'https://aetherflow.ai',
    industry: 'Developer Tools / Sovereign AI',
    stage: 'Seed',
    team_size: '12 FTE',
    runway_months: 9.0,
    one_liner: 'Privacy-preserving sovereign institutional memory and codebase invariant operating system.',
    core_thesis: 'Early-stage startups die of institutional context decay, code invariant breaches, and unvetted cloud AI leaks.',
    icp: 'Regulated Enterprises, Defense Contractors, and Fast-Growing Startups',
    tech_stack: 'Python, TypeScript, FastAPI, React 19, SQLite WAL, Kùzu Graph, Tree-sitter',
    enterprise_policy: 'REJECT_CUSTOM_FORKS',
    pricing_model: 'TIERED_SUBSCRIPTION',
    tars_tone: 'CONCISE_EXECUTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  private decisions: DecisionItem[] = [...MOCK_DECISIONS];
  private calls: VoiceToSpecResponse[] = [...MOCK_CALLS];
  private invariants: InvariantCheckResult[] = [...MOCK_INVARIANTS];
  private actions: ActionItemDTO[] = [...MOCK_ACTION_ITEMS];

  async getCompanyProfile(_companyIdOrName?: string): Promise<CompanyProfile | null> {
    await sleep(40);
    // In mock mode always return the canonical profile regardless of query
    return this.companyProfile ? { ...this.companyProfile } : null;
  }

  async saveCompanyProfile(profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    await sleep(80);
    const updated: CompanyProfile = {
      id: this.companyProfile?.id || `CMP-${Date.now()}`,
      company_name: profile.company_name || this.companyProfile?.company_name || 'Autonomous Venture',
      website: profile.website ?? this.companyProfile?.website,
      industry: profile.industry || this.companyProfile?.industry || 'B2B SaaS',
      stage: profile.stage || this.companyProfile?.stage || 'Seed',
      team_size: profile.team_size || this.companyProfile?.team_size || '1–5',
      runway_months: profile.runway_months ?? this.companyProfile?.runway_months ?? 18,
      one_liner: profile.one_liner || this.companyProfile?.one_liner || '',
      core_thesis: profile.core_thesis ?? this.companyProfile?.core_thesis,
      icp: profile.icp ?? this.companyProfile?.icp,
      tech_stack: profile.tech_stack ?? this.companyProfile?.tech_stack,
      enterprise_policy: profile.enterprise_policy ?? this.companyProfile?.enterprise_policy ?? 'REJECT_CUSTOM_FORKS',
      pricing_model: profile.pricing_model ?? this.companyProfile?.pricing_model ?? 'USAGE_BASED',
      tars_tone: profile.tars_tone ?? this.companyProfile?.tars_tone ?? 'CONCISE_EXECUTIVE',
      updated_at: new Date().toISOString(),
    };
    this.companyProfile = updated;
    return { ...updated };
  }

  async bloomGenesis(payload: GenesisBloomPayload): Promise<GenesisBloomResponse> {
    await sleep(150);
    const profile = await this.saveCompanyProfile(payload);
    return {
      status: 'BLOOMED',
      company_profile: profile,
      seeded_decisions: ['DEC-GEN-001', 'DEC-GEN-002', 'DEC-GEN-003'],
      flight_plans_count: 4,
      loaded_assets: payload.load_sample_assets ? ['Financial Model', 'Discovery Call'] : [],
      nodes_bloomed: 18,
      timestamp: Date.now(),
    };
  }

  async uploadSeedDocument(file: File): Promise<{ doc_id: string; title: string; pages?: number; message?: string }> {
    await sleep(200);
    return {
      doc_id: `DOC-SEED-${Date.now()}`,
      title: file.name,
      pages: 3,
      message: `Parsed and indexed ${file.name} into local sovereign memory.`
    };
  }


  async search(req: SearchRequest): Promise<SearchResponse> {
    if (!req.query || req.query.trim().length === 0) {
      return {
        query: "",
        answer: "Please enter a search query to search across company documents, past decisions, client transcripts, and architectural records.",
        citations: [],
        latency_ms: 12.4
      };
    }

    // Pass through to local backend SLM (Qwen) if available
    try {
      console.log('[TARS SLM] Sending query to local model (/api/core/search):', req.query);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const res = await fetch('/api/core/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const liveRes = await res.json();
        console.log('[TARS SLM] Received live response from local model:', liveRes);
        if (liveRes && liveRes.answer && liveRes.answer.trim().length > 0) {
          const q = req.query.toLowerCase();
          const fallbackCits = (q.includes('saml') || q.includes('sso') || q.includes('acme'))
            ? MOCK_SEARCH_RESULTS.saml.citations
            : MOCK_SEARCH_RESULTS.default.citations;
          return {
            query: liveRes.query || req.query,
            answer: liveRes.answer,
            citations: Array.isArray(liveRes.citations) && liveRes.citations.length > 0
              ? liveRes.citations
              : fallbackCits,
            latency_ms: liveRes.latency_ms || 28.5,
          };
        }
      }
    } catch (err) {
      console.warn('[TARS SLM] Local backend query failed or timed out; falling back to fixtures:', err);
    }

    const q = req.query.toLowerCase();
    if (q.includes('saml') || q.includes('sso') || q.includes('acme') || q.includes('commitment')) {
      return MOCK_SEARCH_RESULTS.saml;
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

  async applyRefactor(ruleId: string): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> {
    await sleep(40);
    this.invariants = this.invariants.map((inv) => {
      if (inv.rule_id === ruleId) {
        return {
          ...inv,
          is_breached: false,
          observed_code: inv.refactored_code || inv.observed_code,
        };
      }
      return inv;
    });
    return { success: true, invariants: [...this.invariants] };
  }

  async resetRefactors(): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> {
    await sleep(30);
    this.invariants = [...MOCK_INVARIANTS];
    return { success: true, invariants: [...this.invariants] };
  }

  async getMadr(ruleId: string): Promise<MadrResponse> {
    await sleep(25);
    const inv = this.invariants.find((i) => i.rule_id === ruleId) || this.invariants[0];
    return {
      rule_id: inv.rule_id,
      rule_name: inv.rule_name,
      file_name: `${inv.rule_id.toLowerCase()}-adr.md`,
      path: `docs/adr/${inv.adr_ref}`,
      content: `# ${inv.rule_id}: ${inv.rule_name}\n\n* **Status:** Accepted\n* **Scope:** \`${inv.violating_file}\`\n\n## Context & Problem Statement\n${inv.rationale}\n\n## Decision Outcome\n${inv.suggested_refactor}\n`,
      problem_statement: inv.rationale,
      decision_outcome: inv.suggested_refactor,
    };
  }

  async simulatePreCommit(ruleId: string): Promise<PreCommitSimulationResponse> {
    await sleep(35);
    const sim = MOCK_PRECOMMIT_SIMULATIONS[ruleId] || MOCK_PRECOMMIT_SIMULATIONS['INV-017'];
    const inv = this.invariants.find((i) => i.rule_id === ruleId);
    if (inv && !inv.is_breached) {
      return MOCK_PRECOMMIT_SIMULATIONS['CLEAN'];
    }
    return sim;
  }

  async getTopology(activeRuleId?: string): Promise<TopologyResponse> {
    await sleep(20);
    const currentRule = activeRuleId || "INV-017";
    const breached = this.invariants.some((i) => i.rule_id === currentRule && i.is_breached);
    return {
      ...MOCK_TOPOLOGY,
      active_rule_id: currentRule,
      refactored: !breached,
      nodes: MOCK_TOPOLOGY.nodes.map((node) => {
        if (node.id === 'payments' && currentRule === 'INV-017') {
          return { ...node, isBreached: breached };
        }
        if (node.id === 'auth' && (currentRule === 'INV-008' || currentRule === 'INV-004')) {
          return { ...node, isBreached: breached };
        }
        if (node.id === 'gateway' && (currentRule === 'INV-API01' || currentRule === 'INV-001')) {
          return { ...node, isBreached: breached };
        }
        return { ...node, isBreached: false };
      }),
      edges: MOCK_TOPOLOGY.edges.map((edge) => {
        if (edge.source === 'payments' && edge.target === 'db' && currentRule === 'INV-017') {
          return { ...edge, isBreached: breached };
        }
        if (edge.source === 'gateway' && edge.target === 'payments' && currentRule === 'INV-017') {
          return { ...edge, isBreached: breached };
        }
        return { ...edge, isBreached: false };
      }),
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

  // --- User & Identity Registry ---
  private mockUsers: import('../types/contracts').UserDTO[] = [
    { id: 'usr-alex', name: 'Alex Vance', email: 'alex@aetherflow.ai', role: 'FOUNDER', department: 'Executive', clearance: 'EXECUTIVE_ONLY', created_at: Date.now() - 86400000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
    { id: 'usr-elena', name: 'Dr. Elena Rostova', email: 'elena@aetherflow.ai', role: 'ENGINEER', department: 'Engineering', clearance: 'ALL_TEAM', created_at: Date.now() - 72000000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
    { id: 'usr-marcus', name: 'Marcus Chen', email: 'marcus@aetherflow.ai', role: 'PRODUCT', department: 'Product', clearance: 'ALL_TEAM', created_at: Date.now() - 54000000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
    { id: 'usr-sarah', name: 'Sarah Jenkins', email: 'sarah@aetherflow.ai', role: 'SALES', department: 'Sales & Growth', clearance: 'ALL_TEAM', created_at: Date.now() - 36000000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
    { id: 'usr-chloe', name: 'Chloe Dubois', email: 'chloe@aetherflow.ai', role: 'NEW_HIRE', department: 'Engineering', clearance: 'ALL_TEAM', created_at: Date.now() - 18000000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
    { id: 'usr-liam', name: 'Liam Patel', email: 'liam@aetherflow.ai', role: 'ENGINEER', department: 'Engineering', clearance: 'ALL_TEAM', created_at: Date.now() - 40000000, company_name: 'AetherFlow Technologies, Inc.', company_id: 'CMP-GENESIS-01' },
  ];

  async getUsers(companyIdOrName?: string): Promise<import('../types/contracts').UserDTO[]> {
    await sleep(30);
    if (companyIdOrName) {
      const lower = companyIdOrName.toLowerCase();
      return this.mockUsers.filter(
        (u) =>
          u.company_id?.toLowerCase() === lower ||
          u.company_name?.toLowerCase().includes(lower)
      );
    }
    return [...this.mockUsers];
  }

  async createUser(payload: import('../types/contracts').UserCreateDTO): Promise<import('../types/contracts').UserDTO> {
    await sleep(50);
    const role = payload.role || 'ENGINEER';
    const dept = payload.department || (role === 'FOUNDER' ? 'Executive' : role === 'PRODUCT' ? 'Product' : role === 'SALES' ? 'Sales & Growth' : 'Engineering');
    const clr = (payload.clearance as any) || (role === 'FOUNDER' ? 'EXECUTIVE_ONLY' : 'ALL_TEAM');
    const companyId = payload.company_id || (payload.company_name ? `CMP-${Date.now().toString().slice(-4)}` : undefined);
    const companyName = payload.company_name || undefined;

    if (payload.company_name) {
      this.companyProfile = {
        id: companyId || `CMP-${Date.now().toString().slice(-4)}`,
        company_name: payload.company_name,
        website: '',
        industry: 'B2B SaaS',
        stage: 'Seed',
        team_size: '1–5',
        runway_months: 18,
        one_liner: `${payload.company_name} sovereign intelligence workspace.`,
        enterprise_policy: 'REJECT_CUSTOM_FORKS',
        pricing_model: 'USAGE_BASED',
        tars_tone: 'CONCISE_EXECUTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const newUser: import('../types/contracts').UserDTO = {
      id: `usr-${Date.now().toString(36)}`,
      name: payload.name,
      email: payload.email,
      role: role,
      department: dept,
      clearance: clr,
      created_at: Date.now(),
      company_id: companyId,
      company_name: companyName,
    };
    this.mockUsers.push(newUser);
    return newUser;
  }

  async resetWorkspace(payload?: import('../types/contracts').WorkspaceResetRequest): Promise<import('../types/contracts').WorkspaceResetResponse> {
    await sleep(60);
    const resetType = payload?.reset_type || 'ALL';
    if (resetType === 'ALL' || resetType === 'ACTIONS') {
      this.actions = [];
    }
    if (resetType === 'ALL' || resetType === 'DECISIONS') {
      this.decisions = [];
    }
    if (resetType === 'ALL' && !payload?.preserve_company_profile) {
      this.companyProfile = null;
    }
    return {
      status: 'SUCCESS',
      message: `Workspace reset executed successfully (${resetType}).`,
      cleared: {
        documents: 0,
        action_items: resetType === 'ALL' || resetType === 'ACTIONS' ? 5 : 0,
        decisions: resetType === 'ALL' || resetType === 'DECISIONS' ? 3 : 0,
      },
      timestamp: Date.now(),
    };
  }
}
