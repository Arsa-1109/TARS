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

const API_BASE = '/api';

export class LiveTarsApi implements TarsApi {
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

  async search(req: SearchRequest): Promise<SearchResponse> {
    return this.fetchJson<SearchResponse>('/core/search', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async uploadDocument(file: File): Promise<{ doc_id: string; title: string; pages: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/ingestion/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  }

  async getCalls(): Promise<VoiceToSpecResponse[]> {
    return this.fetchJson<VoiceToSpecResponse[]>('/ingestion/calls');
  }

  async getCall(id: string): Promise<VoiceToSpecResponse | null> {
    try {
      return await this.fetchJson<VoiceToSpecResponse>(`/ingestion/calls/${id}`);
    } catch {
      return null;
    }
  }

  async uploadCallAudio(file: File): Promise<VoiceToSpecResponse> {
    const formData = new FormData();
    formData.append('audio', file);
    const res = await fetch(`${API_BASE}/ingestion/calls/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Audio upload failed: ${res.statusText}`);
    return res.json();
  }

  async getDecisions(): Promise<DecisionItem[]> {
    return this.fetchJson<DecisionItem[]>('/cortex/decisions');
  }

  async getDecision(id: string): Promise<DecisionItem | null> {
    try {
      return await this.fetchJson<DecisionItem>(`/cortex/decisions/${id}`);
    } catch {
      return null;
    }
  }

  async checkContradiction(proposal: string, severity = "BALANCED"): Promise<ContradictionCheckResponse> {
    return this.fetchJson<ContradictionCheckResponse>('/cortex/decisions/check', {
      method: 'POST',
      body: JSON.stringify({ proposal, severity }),
    });
  }

  async simulateImpact(req: SimulationRequest): Promise<SimulationResponse> {
    return this.fetchJson<SimulationResponse>('/cortex/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async recordDecision(decision: Omit<DecisionItem, 'id' | 'timestamp'>): Promise<DecisionItem> {
    return this.fetchJson<DecisionItem>('/cortex/decisions', {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  }

  async getInvariants(): Promise<InvariantCheckResult[]> {
    return this.fetchJson<InvariantCheckResult[]>('/cortex/invariants');
  }

  async triggerASTCheck(): Promise<{ execution_time_ms: number; results: InvariantCheckResult[] }> {
    return this.fetchJson<{ execution_time_ms: number; results: InvariantCheckResult[] }>('/cortex/invariants/check', {
      method: 'POST',
    });
  }

  async getActionItems(): Promise<ActionItemDTO[]> {
    return this.fetchJson<ActionItemDTO[]>('/ingestion/actions');
  }

  async updateActionStatus(id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO> {
    return this.fetchJson<ActionItemDTO>(`/ingestion/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async createActionItem(item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO> {
    return this.fetchJson<ActionItemDTO>('/ingestion/actions', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }
}
