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
  OnboardingFlightPlanDTO,
  OnboardingFlightPlanCreate,
  OnboardingProgressUpdateDTO,
  OnboardingModuleDTO,
  ActionReceipt,
  ActionTransitionRequest,
  ActionExecuteRequest,
  ActionRollbackRequest,
  AuditBlockDTO,
  AuditVerifyResponse,
  UnverifiedFactDTO,
  FactTransitionRequest,
  FactTransitionResponse,
  PolicyRule,
  PolicyDecision,
  PolicyEvaluateRequest,
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

export const MOCK_AETHERFLOW_PROFILE: CompanyProfile = {
  id: 'CMP-GENESIS-01',
  company_name: 'AetherFlow Technologies, Inc.',
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

export class MockTarsApi implements TarsApi {
  // Fresh/unbloomed sessions start with null so new accounts never leak AetherFlow
  private companyProfile: CompanyProfile | null = null;
  private companyProfiles: Map<string, CompanyProfile> = new Map([
    ['cmp-genesis-01', MOCK_AETHERFLOW_PROFILE],
    ['aetherflow technologies, inc.', MOCK_AETHERFLOW_PROFILE],
    ['aetherflow ai', MOCK_AETHERFLOW_PROFILE],
    ['aetherflow', MOCK_AETHERFLOW_PROFILE],
  ]);

  private decisions: DecisionItem[] = [...MOCK_DECISIONS];
  private calls: VoiceToSpecResponse[] = [...MOCK_CALLS];
  private invariants: InvariantCheckResult[] = [...MOCK_INVARIANTS];
  private actions: ActionItemDTO[] = [...MOCK_ACTION_ITEMS];
  private mockFlightPlans: Map<string, OnboardingModuleDTO[]> = new Map();
  private mockProgress: Map<string, Record<string, boolean>> = new Map();

  async getCompanyProfile(companyIdOrName?: string): Promise<CompanyProfile | null> {
    await sleep(40);
    if (companyIdOrName && companyIdOrName.trim()) {
      const key = companyIdOrName.trim().toLowerCase();
      if (this.companyProfiles.has(key)) {
        return { ...this.companyProfiles.get(key)! };
      }
      for (const [id, prof] of this.companyProfiles.entries()) {
        if (id.toLowerCase() === key || prof.company_name.toLowerCase() === key) {
          return { ...prof };
        }
      }
      return null;
    }

    // If no specific company identifier was queried, check active user profile
    try {
      const savedUser = localStorage.getItem('tars_current_user_profile');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const comp = (parsed.company_name || parsed.company_id || '').trim().toLowerCase();
        if (comp) {
          if (this.companyProfiles.has(comp)) {
            return { ...this.companyProfiles.get(comp)! };
          }
          for (const [id, prof] of this.companyProfiles.entries()) {
            if (id.toLowerCase() === comp || prof.company_name.toLowerCase() === comp) {
              return { ...prof };
            }
          }
          return null;
        }
      }
    } catch {}

    // Unbloomed or generic new session returns null
    return this.companyProfile ? { ...this.companyProfile } : null;
  }

  async saveCompanyProfile(profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    await sleep(80);
    const compName = profile.company_name || this.companyProfile?.company_name || 'Autonomous Venture';
    const compId = profile.id || this.companyProfile?.id || `CMP-${Date.now()}`;
    const updated: CompanyProfile = {
      id: compId,
      company_name: compName,
      website: profile.website ?? this.companyProfile?.website ?? '',
      industry: profile.industry || this.companyProfile?.industry || 'B2B SaaS',
      stage: profile.stage || this.companyProfile?.stage || 'Seed',
      team_size: profile.team_size || this.companyProfile?.team_size || '1–5',
      runway_months: profile.runway_months ?? this.companyProfile?.runway_months ?? 18,
      one_liner: profile.one_liner || this.companyProfile?.one_liner || `${compName} sovereign intelligence workspace.`,
      core_thesis: profile.core_thesis ?? this.companyProfile?.core_thesis,
      icp: profile.icp ?? this.companyProfile?.icp,
      tech_stack: profile.tech_stack ?? this.companyProfile?.tech_stack ?? 'Python, TypeScript, SQLite',
      enterprise_policy: profile.enterprise_policy ?? this.companyProfile?.enterprise_policy ?? 'REJECT_CUSTOM_FORKS',
      pricing_model: profile.pricing_model ?? this.companyProfile?.pricing_model ?? 'USAGE_BASED',
      tars_tone: profile.tars_tone ?? this.companyProfile?.tars_tone ?? 'CONCISE_EXECUTIVE',
      updated_at: new Date().toISOString(),
    };
    this.companyProfile = updated;
    this.companyProfiles.set(compId.toLowerCase(), updated);
    this.companyProfiles.set(compName.toLowerCase().trim(), updated);
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

  private mockReceipts: Map<string, ActionReceipt[]> = new Map();

  async transitionAction(id: string, req: ActionTransitionRequest): Promise<ActionItemDTO> {
    await sleep(35);
    const item = this.actions.find((a) => a.id === id);
    if (!item) throw new Error("Action item not found");
    item.status = req.target_status as any;
    return { ...item };
  }

  async executeAction(id: string, req?: ActionExecuteRequest): Promise<ActionReceipt> {
    await sleep(65);
    const item = this.actions.find((a) => a.id === id);
    if (item) {
      item.status = 'COMPLETED';
    }
    const receipt: ActionReceipt = {
      receipt_id: `RCP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      action_id: id,
      status: 'EXECUTED',
      actor: req?.actor_id || 'Alex Vance (CEO)',
      executed_at: Date.now(),
      duration_ms: 42,
      parameters_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      result_summary: `Governed action ${id} executed deterministically with full policy clearance.`,
      rollback_payload: { previous_state: 'APPROVED', rollback_action: `REVERT_${id}` },
      audit_block_id: 'EVT-1004',
      organisation_id: 'CMP-GENESIS-01',
    };
    const current = this.mockReceipts.get(id) || [];
    this.mockReceipts.set(id, [receipt, ...current]);
    return receipt;
  }

  async rollbackAction(id: string, req?: ActionRollbackRequest): Promise<ActionReceipt> {
    await sleep(50);
    const item = this.actions.find((a) => a.id === id);
    if (item) {
      item.status = 'ROLLED_BACK';
    }
    const receipt: ActionReceipt = {
      receipt_id: `RCP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      action_id: id,
      status: 'ROLLED_BACK',
      actor: req?.actor_id || 'Alex Vance (CEO)',
      executed_at: Date.now(),
      duration_ms: 28,
      parameters_hash: 'd41d8cd98f00b204e9800998ecf8427e',
      result_summary: `Compensating rollback applied: ${req?.reason || 'Manual user rollback'}`,
      rollback_payload: null,
      audit_block_id: 'EVT-1005',
      organisation_id: 'CMP-GENESIS-01',
    };
    const current = this.mockReceipts.get(id) || [];
    this.mockReceipts.set(id, [receipt, ...current]);
    return receipt;
  }

  async getActionReceipts(id: string): Promise<ActionReceipt[]> {
    await sleep(20);
    return this.mockReceipts.get(id) || [
      {
        receipt_id: `RCP-${id.slice(-4)}-01`,
        action_id: id,
        status: 'EXECUTED',
        actor: 'Alex Vance (CEO)',
        executed_at: Date.now() - 3600000,
        duration_ms: 38,
        parameters_hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        result_summary: 'Deterministic execution verified against company policies.',
        rollback_payload: { revert_patch: 'PATCH_BACK' },
        audit_block_id: 'EVT-1001',
        organisation_id: 'CMP-GENESIS-01',
      },
    ];
  }

  private mockAuditBlocks: AuditBlockDTO[] = [
    {
      event_id: 'EVT-GENESIS-001',
      sequence_id: 1,
      timestamp: Date.now() - 86400000 * 2,
      actor: 'SYSTEM',
      organisation_id: 'CMP-GENESIS-01',
      action: 'LEDGER_INITIALIZED',
      source: 'CORE_GATEWAY',
      input_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      result_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      event_hash: '8f434346648f6b96df89dda901c5176b10e6d83961dd3c1ac88b59b2dc327aa4',
      is_valid: true,
    },
    {
      event_id: 'EVT-0002',
      sequence_id: 2,
      timestamp: Date.now() - 86400000,
      actor: 'Alex Vance',
      organisation_id: 'CMP-GENESIS-01',
      action: 'POLICY_RATIFIED:BDR-014',
      source: 'DECISION_REGISTRY',
      input_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      result_hash: 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
      previous_hash: '8f434346648f6b96df89dda901c5176b10e6d83961dd3c1ac88b59b2dc327aa4',
      event_hash: 'c5d143003024be51bf141753147814b7e3e29fcf95371bbab72ff2751508dae6',
      is_valid: true,
    },
    {
      event_id: 'EVT-0003',
      sequence_id: 3,
      timestamp: Date.now() - 3600000 * 3,
      actor: 'Dr. Elena Rostova',
      organisation_id: 'CMP-GENESIS-01',
      action: 'ACTION_EXECUTED:ACT-102',
      source: 'GOVERNED_ACTION_HUB',
      input_hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      result_hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
      previous_hash: 'c5d143003024be51bf141753147814b7e3e29fcf95371bbab72ff2751508dae6',
      event_hash: '3a58cf09c73343cc770425a176d634cb94191d848773e35183ca6ed3260783f0',
      is_valid: true,
    },
  ];

  async getAuditTrail(limit: number = 100, entityId?: string): Promise<AuditBlockDTO[]> {
    await sleep(40);
    return [...this.mockAuditBlocks];
  }

  async verifyAuditLedger(): Promise<AuditVerifyResponse> {
    await sleep(80);
    return {
      status: 'AUDIT_VALID',
      total_events: this.mockAuditBlocks.length,
      tip_hash: this.mockAuditBlocks[this.mockAuditBlocks.length - 1].event_hash,
      message: 'Cryptographic ledger chain traverses Genesis to tip with 100% hash integrity.',
    };
  }

  private mockUnverifiedFacts: UnverifiedFactDTO[] = [
    {
      entity_type: 'DOCUMENT',
      entity_id: 'DOC-EXT-881',
      title: 'Series Seed Cap Table Term Sheet',
      content_preview: 'Proposed option pool expansion to 14.5% prior to lead investor close.',
      confidence_state: 'REVIEW_REQUIRED',
      timestamp: Date.now() - 7200000,
      source: 'MarkItDown Ingestion (TermSheet_v2.pdf)',
    },
    {
      entity_type: 'DECISION',
      entity_id: 'DEC-PROP-402',
      title: 'Deprecate Redis Outbox in Favor of SQLite WAL',
      content_preview: 'Single-node sovereign deployment eliminates external distributed broker latency.',
      confidence_state: 'EXTRACTED',
      timestamp: Date.now() - 14400000,
      source: 'Meeting Transcript (Engineering Sync)',
    },
  ];

  async getUnverifiedFacts(orgId?: string, limit: number = 50): Promise<UnverifiedFactDTO[]> {
    await sleep(35);
    return [...this.mockUnverifiedFacts];
  }

  async transitionFactConfidence(req: FactTransitionRequest): Promise<FactTransitionResponse> {
    await sleep(45);
    const fact = this.mockUnverifiedFacts.find((f) => f.entity_id === req.entity_id);
    const prev = fact?.confidence_state || 'REVIEW_REQUIRED';
    if (fact) {
      fact.confidence_state = req.new_state;
    }
    return {
      entity_id: req.entity_id,
      entity_type: req.entity_type,
      previous_state: prev,
      current_state: req.new_state,
      audit_block_id: 'EVT-FACT-099',
      timestamp: Date.now(),
    };
  }

  private mockPolicies: PolicyRule[] = [
    {
      id: 'POL-001',
      action_type: 'DEPLOY_CODE',
      description: 'Enforce AST invariant validation and engineer/founder review before production commit',
      allowed_roles: ['FOUNDER', 'ENGINEER'],
      required_clearance: 'ALL_TEAM',
      max_risk: 'HIGH',
      requires_human: true,
      allowed_tools: ['git_push', 'docker_build'],
      conditions: { min_approvals: 1 },
      organisation_id: 'CMP-GENESIS-01',
      is_active: true,
    },
    {
      id: 'POL-002',
      action_type: 'CAP_TABLE_MUTATION',
      description: 'Strict sovereign lock on founder equity, option pools, and cap table models',
      allowed_roles: ['FOUNDER'],
      required_clearance: 'EXECUTIVE_ONLY',
      max_risk: 'CRITICAL',
      requires_human: true,
      allowed_tools: ['cap_table_writer'],
      conditions: { multi_sig: false },
      organisation_id: 'CMP-GENESIS-01',
      is_active: true,
    },
    {
      id: 'POL-003',
      action_type: 'RECORD_DECISION',
      description: 'Ratification of architectural decision records (MADRs)',
      allowed_roles: ['FOUNDER', 'ENGINEER', 'PRODUCT'],
      required_clearance: 'ALL_TEAM',
      max_risk: 'LOW',
      requires_human: false,
      allowed_tools: ['kuzu_decision_insert'],
      conditions: {},
      organisation_id: 'CMP-GENESIS-01',
      is_active: true,
    },
  ];

  async getPolicies(orgId?: string): Promise<PolicyRule[]> {
    await sleep(30);
    return [...this.mockPolicies];
  }

  async evaluatePolicy(req: PolicyEvaluateRequest): Promise<PolicyDecision> {
    await sleep(40);
    const policy = this.mockPolicies.find((p) => p.action_type === req.action_type && p.is_active);
    if (!policy) {
      return {
        is_allowed: true,
        requires_human: false,
        denial_reasons: [],
        audit_ref: 'POL-DEFAULT-ALLOW',
      };
    }

    const roleAllowed = policy.allowed_roles.includes(req.role);
    const clearanceAllowed =
      policy.required_clearance === 'ALL_TEAM' || req.clearance === policy.required_clearance;

    const denials: string[] = [];
    if (!roleAllowed) {
      denials.push(`Role '${req.role}' is not in allowed roles: [${policy.allowed_roles.join(', ')}]`);
    }
    if (!clearanceAllowed) {
      denials.push(`Clearance '${req.clearance || 'ALL_TEAM'}' is insufficient for required '${policy.required_clearance}'`);
    }

    return {
      is_allowed: denials.length === 0,
      requires_human: policy.requires_human,
      matching_policy_id: policy.id,
      denial_reasons: denials,
      audit_ref: `DEC-${policy.id}`,
    };
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
      const compId = companyId || `CMP-${Date.now().toString().slice(-4)}`;
      const newCompProfile: CompanyProfile = {
        id: compId,
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
      this.companyProfile = newCompProfile;
      this.companyProfiles.set(compId.toLowerCase(), newCompProfile);
      this.companyProfiles.set(payload.company_name.toLowerCase().trim(), newCompProfile);
    } else {
      this.companyProfile = null;
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

  private _generateMockDefaults(companyName: string): OnboardingModuleDTO[] {
    const cName = companyName || 'Sovereign Startup';
    return [
      {
        id: `mod-mock-1-${Date.now()}`,
        company_name: cName,
        day: 1,
        title: `Sovereignty & The Air-Gap Invariant (${cName})`,
        description: `Understand why ${cName} enforces zero cloud egress ($E_{net} = 0.00\\text{ KB}$) and how local on-premise execution protects company IP.`,
        tasks: [
          `Inspect ${cName} institutional identity and core thesis in Knowledge Base`,
          `Verify .tars/invariants.yaml and install local pre-commit AST guards`,
          `Run airplane-mode verification script in local terminal with 0.00 KB egress`,
        ],
        milestone_tour: {
          title: `Founding Thesis: Why Startups Die of Context Decay`,
          audio_duration: '3m 45s',
          speaker: `Founder (${cName})`,
        },
        order_index: 1,
        is_published: true,
        status: 'CURRENT',
      },
      {
        id: `mod-mock-2-${Date.now()}`,
        company_name: cName,
        day: 2,
        title: `Deterministic AST Enforcement & Python, TypeScript, SQLite`,
        description: `Learn how Tree-sitter parses staged Git diffs in <50ms to enforce ${cName}'s architectural standards before commits land in main.`,
        tasks: [
          `Review architectural invariants in Architecture Workspace`,
          `Test local AST query runner against staged diffs in <50ms`,
          `Inspect living MADR generator output in docs/adr/`,
        ],
        order_index: 2,
        is_published: true,
        status: 'UPCOMING',
      },
      {
        id: `mod-mock-3-${Date.now()}`,
        company_name: cName,
        day: 3,
        title: `Institutional Memory & Strategic Policies`,
        description: `Explore the sovereign graph connecting ADR decisions, customer commitments, and code entities for ${cName}.`,
        tasks: [
          `Review policy decisions regarding Strict Rejection of Bespoke Forks`,
          `Trace customer commitments into the Unified Action Hub`,
          `Ask the Socratic Mentor about architectural boundaries and cash runway`,
        ],
        order_index: 3,
        is_published: true,
        status: 'UPCOMING',
      },
      {
        id: `mod-mock-4-${Date.now()}`,
        company_name: cName,
        day: 4,
        title: `First Compliant Pull Request`,
        description: `Author and commit your first feature passing all invariant gates for ${cName}.`,
        tasks: [
          `Implement new service component adhering to Hexagonal architecture`,
          `Verify sub-50ms pre-commit hook execution without regressions`,
          `Submit PR with automated institutional executive summary`,
        ],
        order_index: 4,
        is_published: true,
        status: 'UPCOMING',
      },
    ];
  }

  async getFlightPlan(companyName?: string, userId?: string): Promise<OnboardingFlightPlanDTO> {
    await sleep(40);
    const cName = companyName || 'AetherFlow Technologies, Inc.';
    const key = cName.trim().toLowerCase();

    if (!this.mockFlightPlans.has(key)) {
      this.mockFlightPlans.set(key, this._generateMockDefaults(cName));
    }

    const modules = this.mockFlightPlans.get(key) || [];
    const progressKey = `${key}::${userId || 'usr-default'}`;
    const userProgress = this.mockProgress.get(progressKey) || {};

    const populatedModules = modules.map((m) => {
      const allDone = m.tasks.length > 0 && m.tasks.every((_, idx) => !!userProgress[`${m.day}-${idx}`]);
      return {
        ...m,
        status: (allDone ? 'COMPLETED' : m.day === 1 ? 'CURRENT' : 'UPCOMING') as 'COMPLETED' | 'CURRENT' | 'UPCOMING',
      };
    });

    return {
      company_name: cName,
      title: `${cName} Flight-Plan`,
      total_days: 14,
      current_day: 1,
      modules: populatedModules,
      completed_tasks: { ...userProgress },
      is_published: true,
      updated_at: new Date().toISOString(),
    };
  }

  async saveFlightPlan(plan: OnboardingFlightPlanCreate): Promise<OnboardingFlightPlanDTO> {
    await sleep(60);
    const cName = plan.company_name || 'Sovereign Startup';
    const key = cName.trim().toLowerCase();
    this.mockFlightPlans.set(key, [...plan.modules]);

    return {
      company_name: cName,
      company_id: plan.company_id,
      title: plan.title || `${cName} Flight-Plan`,
      total_days: plan.total_days || 14,
      current_day: 1,
      modules: [...plan.modules],
      completed_tasks: {},
      is_published: true,
      updated_at: new Date().toISOString(),
    };
  }

  async updateTaskProgress(update: OnboardingProgressUpdateDTO): Promise<{ completed_tasks: Record<string, boolean> }> {
    await sleep(30);
    const cName = update.company_name || 'Sovereign Startup';
    const key = cName.trim().toLowerCase();
    const progressKey = `${key}::${update.user_id || 'usr-default'}`;
    const existing = this.mockProgress.get(progressKey) || {};
    existing[update.task_key] = update.completed;
    this.mockProgress.set(progressKey, existing);

    return { completed_tasks: { ...existing } };
  }

  async resetFlightPlanDefaults(companyName: string): Promise<OnboardingFlightPlanDTO> {
    await sleep(50);
    const cName = companyName || 'Sovereign Startup';
    const key = cName.trim().toLowerCase();
    const defaults = this._generateMockDefaults(cName);
    this.mockFlightPlans.set(key, defaults);
    return this.getFlightPlan(cName);
  }
}
