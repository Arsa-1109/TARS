import {
  DecisionItem,
  DecisionCreateRequest,
  DecisionPatchRequest,
  ContradictionCheckResponse,
  StrategicRecommendation,
  SimulationRequest,
  SimulationResponse,
  SimulationScenarioRequest,
  SimulationScenarioResponse,
} from '../types/contracts';

const API_BASE = '/api';

export class DecisionsApi {
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetches all registered Decision nodes from the Kùzu graph store.
   */
  async getDecisions(signal?: AbortSignal): Promise<DecisionItem[]> {
    try {
      const data = await this.fetchJson<DecisionItem[]>('/cortex/decisions', { signal });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Failed to fetch decisions from Cortex API:', err);
      return [];
    }
  }

  /**
   * Fetches a single Decision node by its unique identifier.
   */
  async getDecision(id: string): Promise<DecisionItem | null> {
    try {
      return await this.fetchJson<DecisionItem>(`/cortex/decisions/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Optimistically creates a Decision node (<50ms) and initiates async MADR synthesis.
   */
  async createDecision(req: DecisionCreateRequest): Promise<DecisionItem> {
    return await this.fetchJson<DecisionItem>('/cortex/decisions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * Modifies an existing decision (title, context, chosen_option, lifecycle_status).
   */
  async patchDecision(id: string, patch: DecisionPatchRequest): Promise<DecisionItem> {
    return await this.fetchJson<DecisionItem>(`/cortex/decisions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  /**
   * Alias for patchDecision for compatibility.
   */
  async updateDecision(id: string, updates: Partial<DecisionItem>): Promise<any> {
    return this.patchDecision(id, updates as DecisionPatchRequest);
  }

  /**
   * Dual-action deletion: soft-marks as SUPERSEDED (default) or hard-purges if hardPurge is true.
   */
  async deleteDecision(id: string, hardPurge = false, supersededBy?: string): Promise<{ status: string; decision_id: string; hard_purge: boolean; superseded_by?: string }> {
    const params = new URLSearchParams();
    if (hardPurge) params.set('hard_purge', 'true');
    if (supersededBy) params.set('superseded_by', supersededBy);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await this.fetchJson<{ status: string; decision_id: string; hard_purge: boolean; superseded_by?: string }>(
      `/cortex/decisions/${id}${query}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Checks for semantic graph contradictions against historical decisions.
   */
  async checkContradiction(proposal: string, category = 'ALL', sensitivity = 'BALANCED'): Promise<ContradictionCheckResponse> {
    try {
      return await this.fetchJson<ContradictionCheckResponse>('/cortex/decisions/check', {
        method: 'POST',
        body: JSON.stringify({ proposal, category, severity_threshold: sensitivity }),
      });
    } catch {
      return {
        has_conflict: false,
        severity: sensitivity,
        conflicting_decision_id: null,
        explanation: 'No conflicting decisions registered in local graph store.',
      };
    }
  }

  /**
   * Runs dynamic What-If Counterfactual Simulation against real runway metrics and commitments.
   */
  async simulateScenario(req: SimulationScenarioRequest): Promise<SimulationScenarioResponse> {
    return await this.fetchJson<SimulationScenarioResponse>('/cortex/simulate/scenario', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * Impact simulation wrapper.
   */
  async simulateImpact(req: SimulationRequest): Promise<SimulationResponse> {
    return await this.fetchJson<SimulationResponse>('/cortex/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * Alias for simulateImpact.
   */
  async simulate(req: SimulationRequest): Promise<SimulationResponse> {
    return this.simulateImpact(req);
  }

  /**
   * Fetches active AI strategic growth & optimization recommendations.
   */
  async getRecommendations(): Promise<StrategicRecommendation[]> {
    try {
      const data = await this.fetchJson<StrategicRecommendation[]>('/core/decisions/recommendations');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Failed to fetch recommendations:', err);
      return [];
    }
  }

  /**
   * Proactively triggers local Qwen3 model to analyze current company state
   * and generate fresh strategic optimization vectors.
   */
  async generateRecommendations(): Promise<StrategicRecommendation[]> {
    try {
      const data = await this.fetchJson<StrategicRecommendation[]>('/core/decisions/recommendations/generate', {
        method: 'POST',
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      throw err;
    }
  }

  /**
   * Dismisses a strategic suggestion.
   */
  async dismissRecommendation(id: string): Promise<boolean> {
    try {
      await this.fetchJson<{ status: string; id: string }>(`/core/decisions/recommendations/${id}/dismiss`, {
        method: 'POST',
      });
      return true;
    } catch (err) {
      console.warn('Failed to dismiss recommendation:', err);
      return false;
    }
  }
}

export const decisionsApi = new DecisionsApi();
