// apps/web/src/services/decisionsApi.ts
/**
 * Track 1: Cortex & Strategic Decisions Service
 * Exclusive frontend service decoupled from liveApi.ts.
 */
import { DecisionItem, ContradictionCheckResponse, SimulationRequest, SimulationResponse } from '../types/contracts';

const API_BASE = '/api/cortex';

export const decisionsApi = {
  /**
   * Fetches all registered decisions
   */
  async getDecisions(signal?: AbortSignal): Promise<DecisionItem[]> {
    try {
      const res = await fetch(`${API_BASE}/decisions`, { signal });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  /**
   * Creates a new architectural or strategic decision
   */
  async createDecision(data: {
    id?: string;
    title: string;
    category?: string;
    context: string;
    chosen_option: string;
    clearance?: string;
  }): Promise<DecisionItem> {
    const res = await fetch(`${API_BASE}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create decision: ${res.statusText}`);
    return res.json();
  },

  /**
   * Updates an existing decision (Bug 10)
   */
  async updateDecision(id: string, updates: Partial<DecisionItem>): Promise<any> {
    const res = await fetch(`${API_BASE}/decisions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update decision: ${res.statusText}`);
    return res.json();
  },

  /**
   * Deletes or supersedes an existing decision (Bug 10)
   */
  async deleteDecision(id: string, hardPurge: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/decisions/${encodeURIComponent(id)}?hard_purge=${hardPurge}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete decision: ${res.statusText}`);
    return res.json();
  },

  /**
   * Evaluates proposal against active decisions in Kùzu graph
   */
  async checkContradiction(proposal: string, category: string = 'ALL', severity: string = 'BALANCED'): Promise<ContradictionCheckResponse> {
    const res = await fetch(`${API_BASE}/decisions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal, category, severity }),
    });
    if (!res.ok) throw new Error(`Failed to check contradiction: ${res.statusText}`);
    return res.json();
  },

  /**
   * Runs dynamic what-if simulation (Bug 16)
   */
  async simulate(req: SimulationRequest): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
    return res.json();
  },
};
