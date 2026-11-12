// apps/web/src/services/boundaryParsers.ts
/**
 * Runtime API Ingress Boundary Validators
 *
 * Enforces the Ousterhout / Parse-Don't-Validate boundary invariant:
 * raw JSON entering from the HTTP transport is validated once at ingress
 * into strongly-typed domain DTOs, raising explicit errors on contract violations.
 */
import type {
  ActionItemDTO,
  CompanyProfile,
  ContradictionCheckResponse,
  DecisionItem,
  GenesisBloomResponse,
  InvariantCheckResult,
  OnboardingFlightPlanDTO,
  SearchCitation,
  SearchResponse,
  SimulationResponse,
  SimulationScenarioResponse,
  SystemStatusDTO,
  UserDTO,
  VoiceToSpecResponse,
} from '../types/contracts';

export class BoundaryValidationError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly detail: string
  ) {
    super(`API Contract Violation at ${endpoint}: ${detail}`);
    this.name = 'BoundaryValidationError';
    Object.setPrototypeOf(this, BoundaryValidationError.prototype);
  }
}

function asRecord(value: unknown, endpoint: string, label = 'payload'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BoundaryValidationError(endpoint, `Expected ${label} to be an object.`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, endpoint: string, label = 'payload'): unknown[] {
  if (!Array.isArray(value)) {
    throw new BoundaryValidationError(endpoint, `Expected ${label} to be an array.`);
  }
  return value;
}

function asString(value: unknown, endpoint: string, field: string, fallback?: string): string {
  if (typeof value === 'string') return value;
  if (fallback !== undefined && (value === undefined || value === null)) return fallback;
  throw new BoundaryValidationError(endpoint, `Field '${field}' must be a string.`);
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item));
}

function asNumber(value: unknown, endpoint: string, field: string, fallback?: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (fallback !== undefined && (value === undefined || value === null)) return fallback;
  throw new BoundaryValidationError(endpoint, `Field '${field}' must be a finite number.`);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function parseSearchResponse(raw: unknown, endpoint: string): SearchResponse {
  const rec = asRecord(raw, endpoint);
  const rawCitations = Array.isArray(rec.citations) ? rec.citations : [];
  const citations: SearchCitation[] = rawCitations.map((c, idx) => {
    const item = asRecord(c, endpoint, `citations[${idx}]`);
    return {
      doc_id: asString(item.doc_id ?? '', endpoint, 'doc_id', ''),
      doc_title: asString(item.doc_title ?? 'Document', endpoint, 'doc_title', 'Document'),
      page_number: asNumber(item.page_number, endpoint, 'page_number', 1),
      snippet: asString(item.snippet ?? '', endpoint, 'snippet', ''),
      section_heading: typeof item.section_heading === 'string' ? item.section_heading : undefined,
      chunk_id: typeof item.chunk_id === 'string' ? item.chunk_id : undefined,
    };
  });

  return {
    query: asString(rec.query ?? '', endpoint, 'query', ''),
    answer: asString(rec.answer, endpoint, 'answer', ''),
    citations,
    latency_ms: asNumber(rec.latency_ms, endpoint, 'latency_ms', 0),
  };
}

export function parseDecision(raw: unknown, endpoint: string): DecisionItem {
  const rec = asRecord(raw, endpoint, 'DecisionItem');
  return {
    ...(rec as unknown as DecisionItem),
    id: asString(rec.id, endpoint, 'id'),
    title: asString(rec.title, endpoint, 'title', 'Untitled Decision'),
    category: asString(rec.category, endpoint, 'category', 'ENGINEERING'),
    context: asString(rec.context, endpoint, 'context', ''),
    chosen_option: asString(rec.chosen_option, endpoint, 'chosen_option', ''),
    timestamp: asNumber(rec.timestamp, endpoint, 'timestamp', Date.now()),
    clearance: asString(rec.clearance, endpoint, 'clearance', 'ALL_TEAM'),
  };
}

export function parseDecisionArray(raw: unknown, endpoint: string): DecisionItem[] {
  return asArray(raw, endpoint).map((item) => parseDecision(item, endpoint));
}

export function parseContradictionResponse(raw: unknown, endpoint: string): ContradictionCheckResponse {
  const rec = asRecord(raw, endpoint);
  if (typeof rec.has_conflict !== 'boolean') {
    throw new BoundaryValidationError(endpoint, "Field 'has_conflict' must be a boolean.");
  }
  return {
    has_conflict: rec.has_conflict,
    severity: asString(rec.severity, endpoint, 'severity', 'BALANCED'),
    conflicting_decision_id:
      typeof rec.conflicting_decision_id === 'string' ? rec.conflicting_decision_id : null,
    explanation: typeof rec.explanation === 'string' ? rec.explanation : null,
  };
}

export function parseSimulationResponse(raw: unknown, endpoint: string): SimulationResponse {
  const rec = asRecord(raw, endpoint);
  return {
    runway_impact_months: asNumber(rec.runway_impact_months, endpoint, 'runway_impact_months'),
    delivery_delay_weeks: asNumber(rec.delivery_delay_weeks, endpoint, 'delivery_delay_weeks'),
    risk_score: typeof rec.risk_score === 'number' ? rec.risk_score : undefined,
    affected_client_promises: asStringArray(rec.affected_client_promises),
    affected_code_modules: asStringArray(rec.affected_code_modules),
    executive_synthesis: asString(rec.executive_synthesis, endpoint, 'executive_synthesis', ''),
  };
}

export function parseSimulationScenarioResponse(
  raw: unknown,
  endpoint: string
): SimulationScenarioResponse {
  const rec = asRecord(raw, endpoint);
  const adr = asRecord(rec.pre_populated_adr ?? {}, endpoint, 'pre_populated_adr');
  return {
    baseline_runway_months: asNumber(rec.baseline_runway_months, endpoint, 'baseline_runway_months'),
    simulated_runway_months: asNumber(rec.simulated_runway_months, endpoint, 'simulated_runway_months'),
    runway_delta_months: asNumber(rec.runway_delta_months, endpoint, 'runway_delta_months'),
    compromised_clients: Array.isArray(rec.compromised_clients)
      ? (rec.compromised_clients as SimulationScenarioResponse['compromised_clients'])
      : [],
    compromised_deliverables: Array.isArray(rec.compromised_deliverables)
      ? rec.compromised_deliverables
      : [],
    strategic_narrative: asString(rec.strategic_narrative, endpoint, 'strategic_narrative', ''),
    pre_populated_adr: {
      title: asString(adr.title, endpoint, 'pre_populated_adr.title', ''),
      category: asString(adr.category, endpoint, 'pre_populated_adr.category', 'STRATEGY'),
      context: asString(adr.context, endpoint, 'pre_populated_adr.context', ''),
      chosen_option: asString(adr.chosen_option, endpoint, 'pre_populated_adr.chosen_option', ''),
      drivers: Array.isArray(adr.drivers) ? asStringArray(adr.drivers) : undefined,
    },
  };
}

export function parseInvariantArray(raw: unknown, endpoint: string): InvariantCheckResult[] {
  return asArray(raw, endpoint).map((item, idx) => {
    const rec = asRecord(item, endpoint, `invariants[${idx}]`);
    return {
      ...(rec as unknown as InvariantCheckResult),
      is_breached: asBoolean(rec.is_breached, false),
      rule_id: asString(rec.rule_id, endpoint, 'rule_id'),
      rule_name: asString(rec.rule_name, endpoint, 'rule_name', 'Architectural Invariant'),
      violating_file: asString(rec.violating_file, endpoint, 'violating_file', ''),
      line_number: asNumber(rec.line_number, endpoint, 'line_number', 1),
      rationale: asString(rec.rationale, endpoint, 'rationale', ''),
      adr_ref: asString(rec.adr_ref, endpoint, 'adr_ref', ''),
      suggested_refactor: asString(rec.suggested_refactor, endpoint, 'suggested_refactor', ''),
    };
  });
}

export function parseActionItem(raw: unknown, endpoint: string): ActionItemDTO {
  const rec = asRecord(raw, endpoint, 'ActionItemDTO');
  return {
    ...(rec as unknown as ActionItemDTO),
    id: asString(rec.id, endpoint, 'id'),
    description: asString(rec.description, endpoint, 'description', ''),
    owner: asString(rec.owner, endpoint, 'owner', 'Unassigned'),
    status: asString(rec.status, endpoint, 'status', 'OPEN') as ActionItemDTO['status'],
    source_type: asString(rec.source_type, endpoint, 'source_type', 'CHAT'),
    source_id: asString(rec.source_id, endpoint, 'source_id', ''),
  };
}

export function parseActionItemArray(raw: unknown, endpoint: string): ActionItemDTO[] {
  return asArray(raw, endpoint).map((item) => parseActionItem(item, endpoint));
}

export function parseUserArray(raw: unknown, endpoint: string): UserDTO[] {
  return asArray(raw, endpoint).map((item, idx) => {
    const rec = asRecord(item, endpoint, `users[${idx}]`);
    return {
      ...(rec as unknown as UserDTO),
      id: asString(rec.id, endpoint, 'id'),
      name: asString(rec.name, endpoint, 'name'),
      email: asString(rec.email, endpoint, 'email', ''),
      role: asString(rec.role, endpoint, 'role', 'ENGINEER') as UserDTO['role'],
      department: asString(rec.department, endpoint, 'department', 'Engineering'),
      clearance: asString(rec.clearance, endpoint, 'clearance', 'ALL_TEAM') as UserDTO['clearance'],
      created_at: asNumber(rec.created_at, endpoint, 'created_at', 0),
    };
  });
}

export function parseCompanyProfile(raw: unknown, endpoint: string): CompanyProfile | null {
  if (raw === null || raw === undefined) return null;
  const rec = asRecord(raw, endpoint, 'CompanyProfile');
  if (!rec.company_name && !rec.id) return null;
  return {
    ...(rec as unknown as CompanyProfile),
    id: asString(rec.id, endpoint, 'id', 'CMP-ACTIVE'),
    company_name: asString(rec.company_name, endpoint, 'company_name'),
    industry: asString(rec.industry, endpoint, 'industry', 'Technology'),
    stage: asString(rec.stage, endpoint, 'stage', 'Seed'),
    team_size: asString(rec.team_size, endpoint, 'team_size', '1-10'),
    one_liner: asString(rec.one_liner, endpoint, 'one_liner', ''),
  };
}

export function parseGenesisBloomResponse(raw: unknown, endpoint: string): GenesisBloomResponse {
  const rec = asRecord(raw, endpoint, 'GenesisBloomResponse');
  const profile = parseCompanyProfile(rec.company_profile, `${endpoint}.company_profile`);
  if (!profile) {
    throw new BoundaryValidationError(endpoint, "Missing required 'company_profile' in bloom response.");
  }
  return {
    status: asString(rec.status, endpoint, 'status', 'BLOOMED'),
    company_profile: profile,
    seeded_decisions: asStringArray(rec.seeded_decisions),
    flight_plans_count: asNumber(rec.flight_plans_count, endpoint, 'flight_plans_count', 0),
    loaded_assets: asStringArray(rec.loaded_assets),
    nodes_bloomed: asNumber(rec.nodes_bloomed, endpoint, 'nodes_bloomed', 0),
    timestamp: asNumber(rec.timestamp, endpoint, 'timestamp', Date.now()),
  };
}

export function parseOnboardingFlightPlan(raw: unknown, endpoint: string): OnboardingFlightPlanDTO {
  const rec = asRecord(raw, endpoint, 'OnboardingFlightPlanDTO');
  const modulesRaw = asArray(rec.modules ?? [], endpoint, 'modules');
  const completedTasks: Record<string, boolean> = {};
  if (rec.completed_tasks && typeof rec.completed_tasks === 'object' && !Array.isArray(rec.completed_tasks)) {
    for (const [k, v] of Object.entries(rec.completed_tasks as Record<string, unknown>)) {
      completedTasks[k] = Boolean(v);
    }
  }
  return {
    ...(rec as unknown as OnboardingFlightPlanDTO),
    company_name: asString(rec.company_name, endpoint, 'company_name', 'Sovereign Startup'),
    title: asString(rec.title, endpoint, 'title', 'Onboarding Flight Plan'),
    total_days: asNumber(rec.total_days, endpoint, 'total_days', Math.max(1, modulesRaw.length)),
    current_day: asNumber(rec.current_day, endpoint, 'current_day', 1),
    modules: modulesRaw as OnboardingFlightPlanDTO['modules'],
    completed_tasks: completedTasks,
    is_published: asBoolean(rec.is_published, true),
  };
}

export function parseCallsArray(raw: unknown, endpoint: string): VoiceToSpecResponse[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown> | null)?.calls)
      ? ((raw as Record<string, unknown>).calls as unknown[])
      : null;

  if (!list) {
    throw new BoundaryValidationError(endpoint, 'Expected calls array or { calls: [...] } envelope.');
  }

  return list.map((item, idx) => {
    const c = asRecord(item, endpoint, `calls[${idx}]`);
    const callId = asString(c.call_id ?? c.task_id ?? `CALL-${idx + 1}`, endpoint, 'call_id');
    const clientName = asString(c.client_name ?? c.filename ?? 'Voice Call', endpoint, 'client_name');
    const rawTranscriptText =
      typeof c.transcript_text === 'string'
        ? c.transcript_text
        : typeof c.transcript === 'string'
          ? c.transcript
          : '';

    const transcript = Array.isArray(c.transcript)
      ? c.transcript.map((t: any) => ({
          speaker: String(t?.speaker || clientName),
          timestamp: String(t?.timestamp || '00:00'),
          seconds: typeof t?.seconds === 'number' ? t.seconds : 0,
          text: String(t?.text || ''),
        }))
      : rawTranscriptText
        ? [{ speaker: clientName, timestamp: '00:00', seconds: 0, text: rawTranscriptText }]
        : [];

    return {
      call_id: callId,
      client_name: clientName,
      sentiment: asString(c.sentiment, endpoint, 'sentiment', 'NEUTRAL'),
      summary: asString(c.summary, endpoint, 'summary', 'Call debrief processed locally via Whisper.'),
      pain_points: asStringArray(c.pain_points),
      feature_requests: asStringArray(c.feature_requests),
      commitments: asStringArray(c.commitments),
      audio_duration_seconds: Math.round(asNumber(c.audio_duration_seconds ?? c.duration_seconds, endpoint, 'audio_duration_seconds', 15)),
      has_audio: typeof c.has_audio === 'boolean' ? c.has_audio : undefined,
      recorded_at: typeof c.recorded_at === 'string' ? c.recorded_at : 'Just now',
      transcript,
    };
  });
}

export function parseSystemStatus(raw: unknown, endpoint: string): SystemStatusDTO {
  const rec = asRecord(raw, endpoint, 'SystemStatusDTO');
  return {
    status: asString(rec.status, endpoint, 'status', 'UNKNOWN'),
    database: asString(rec.database, endpoint, 'database', 'UNKNOWN'),
    ollama: asString(rec.ollama, endpoint, 'ollama', 'OFFLINE'),
    mcp_tools: asNumber(rec.mcp_tools, endpoint, 'mcp_tools', 0),
    airplane_mode: asBoolean(rec.airplane_mode, true),
  };
}
