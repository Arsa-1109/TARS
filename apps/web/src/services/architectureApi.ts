// apps/web/src/services/architectureApi.ts
/**
 * Dedicated Architecture & Platform Sentinel API service (Track 4).
 * Decoupled from liveApi.ts to ensure zero-conflict bounded context.
 */
import {
  InvariantCheckResult,
  MadrResponse,
  PreCommitSimulationResponse,
  TopologyResponse,
} from '../types/contracts';

export interface StagedBreachDetail {
  rule_id: string;
  rule_name: string;
  violating_file: string;
  line_number: number;
  rationale: string;
  suggested_refactor: string;
  is_breached: boolean;
  violating_code?: string;
}

export interface StagedRadarCheckResponse {
  staged_files_count: number;
  inspection_latency_ms: number;
  breaches_found: number;
  breach_details: StagedBreachDetail[];
  push_sentinel_active: boolean;
}

class ArchitectureApiService {
  /**
   * Evaluates repository status and staged AST invariants in <45ms.
   */
  async checkStaged(): Promise<StagedRadarCheckResponse> {
    const start = performance.now();
    try {
      const res = await fetch('/api/cortex/staged');
      const elapsed = Math.round((performance.now() - start) * 10) / 10;

      if (!res.ok) {
        throw new Error(`Cortex staged check failed with status: ${res.status}`);
      }

      const data = await res.json();
      return {
        staged_files_count: data.staged_files_count ?? 0,
        inspection_latency_ms: data.inspection_latency_ms ?? elapsed,
        breaches_found: data.breaches_found ?? 0,
        breach_details: (data.breach_details || []).map((b: any) => ({
          rule_id: b.rule_id,
          rule_name: b.rule_name,
          violating_file: b.violating_file || '',
          line_number: b.line_number || 1,
          rationale: b.rationale,
          suggested_refactor: b.suggested_refactor,
          is_breached: true,
          violating_code: b.observed_code,
        })),
        push_sentinel_active: data.push_sentinel_active ?? true,
      };
    } catch {
      // Item 131: Honest failure without synthetic fabrication
      return {
        staged_files_count: 0,
        inspection_latency_ms: 0,
        breaches_found: 0,
        breach_details: [],
        push_sentinel_active: false,
      };
    }
  }

  async getInvariants(): Promise<InvariantCheckResult[]> {
    const res = await fetch('/api/cortex/invariants');
    if (!res.ok) throw new Error('Failed to load invariants');
    return res.json();
  }

  async triggerASTCheck(): Promise<{ execution_time_ms: number; results: InvariantCheckResult[] }> {
    const res = await fetch('/api/cortex/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to trigger AST scan');
    return res.json();
  }

  async applyRefactor(ruleId: string): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> {
    const res = await fetch(`/api/cortex/invariants/refactor/${encodeURIComponent(ruleId)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to apply refactor for ${ruleId}`);
    return res.json();
  }

  async resetRefactors(): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> {
    const res = await fetch('/api/cortex/invariants/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset refactors');
    return res.json();
  }

  async getTopology(activeRuleId?: string): Promise<TopologyResponse> {
    const url = activeRuleId
      ? `/api/cortex/graph/topology?active_rule_id=${encodeURIComponent(activeRuleId)}`
      : '/api/cortex/graph/topology';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch topology');
    return res.json();
  }

  async getMadr(ruleId: string): Promise<MadrResponse> {
    const res = await fetch(`/api/cortex/invariants/madr/${encodeURIComponent(ruleId)}`);
    if (!res.ok) throw new Error(`Failed to fetch MADR for ${ruleId}`);
    return res.json();
  }

  async simulatePreCommit(ruleId: string): Promise<PreCommitSimulationResponse> {
    const res = await fetch(`/api/cortex/invariants/simulator/${encodeURIComponent(ruleId)}`);
    if (!res.ok) throw new Error(`Failed to fetch simulation for ${ruleId}`);
    return res.json();
  }
}

export const architectureApi = new ArchitectureApiService();
