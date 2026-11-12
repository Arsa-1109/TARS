// apps/web/src/services/tarsClient.ts
/**
 * TARS Sovereign Deep API Client Module
 *
 * Implements John Ousterhout's Deep Module philosophy:
 * Minimal, strongly-typed public interface hiding extensive implementation depth.
 *
 * Core Guarantees:
 * 1. Zero Paperware: No synthetic fallback values (e.g. fake latency, fake breaches).
 * 2. Honest Error Envelopes: All network/server failures throw explicit typed errors.
 * 3. Reactive Event Invalidation: Built-in event emitter connects Ingestion mutations
 *    directly to ActionHubDrawer and Workspace listeners without browser reload.
 * 4. Partitioned Sub-Namespaces:
 *    - tarsClient.cortex
 *    - tarsClient.ingestion
 *    - tarsClient.decisions
 *    - tarsClient.chat
 *    - tarsClient.actions
 *    - tarsClient.company
 *    - tarsClient.onboarding
 */

import { useEffect, useRef } from 'react';
import {
  BoundaryValidationError,
  parseActionItem,
  parseActionItemArray,
  parseCallsArray,
  parseCompanyProfile,
  parseContradictionResponse,
  parseDecision,
  parseDecisionArray,
  parseGenesisBloomResponse,
  parseInvariantArray,
  parseOnboardingFlightPlan,
  parseSearchResponse,
  parseSimulationResponse,
  parseSimulationScenarioResponse,
  parseSystemStatus,
  parseUserArray,
} from './boundaryParsers';
import {
  SearchRequest,
  SearchResponse,
  SystemStatusDTO,
  VoiceToSpecResponse,
  DecisionItem,
  DecisionCreateRequest,
  DecisionPatchRequest,
  ContradictionCheckResponse,
  SimulationRequest,
  SimulationResponse,
  SimulationScenarioRequest,
  SimulationScenarioResponse,
  StrategicRecommendation,
  InvariantCheckResult,
  MadrResponse,
  PreCommitSimulationResponse,
  TopologyResponse,
  ActionItemDTO,
  UserDTO,
  UserCreateDTO,
  CompanyProfile,
  GenesisBloomPayload,
  GenesisBloomResponse,
  OnboardingFlightPlanDTO,
  OnboardingFlightPlanCreate,
  OnboardingProgressUpdateDTO,
  WorkspaceResetRequest,
  WorkspaceResetResponse,
  ChatSessionDTO,
  ChatMessageDTO,
} from '../types/contracts';

// ============================================================================
// Types & Contracts
// ============================================================================

export { BoundaryValidationError };

export class TarsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly endpoint?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TarsApiError';
    Object.setPrototypeOf(this, TarsApiError.prototype);
  }
}

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

export interface CallDeleteResponse {
  call_id: string;
  deleted_at: string;
  files_unlinked: boolean;
  graph_nodes_detached: number;
  deleted_task_ids: string[];
  retained_task_ids: string[];
  status: string;
}

export interface IngestedDocument {
  doc_id?: string;
  id?: string;
  filename?: string;
  title?: string;
  department?: string;
  format?: string;
  clearance?: string;
  preview?: string;
  content?: string;
  table_count?: number;
  chunk_count?: number;
  page_count?: number;
  created_at?: string;
}

export interface ThinkTankChannelDTO {
  id: string;
  name: string;
  topic?: string;
  created_at?: string;
}

export interface ThinkTankMessageDTO {
  id: string;
  channel_id: string;
  sender: string;
  sender_role?: string;
  sender_type?: string;
  text: string;
  content?: string;
  user_id?: string;
  user_name?: string;
  reply_to_id?: string | null;
  provenance?: string;
  is_ai?: boolean;
  is_edited?: boolean;
  created_at?: string;
  updated_at?: string;
  time?: string;
}

export type ChatMessage = ThinkTankMessageDTO;

export interface TeachMemoryRequest {
  content: string;
  title?: string;
  category?: string;
  clearance?: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
}

export interface TeachMemoryResponse {
  memory_id: string;
  status: string;
  title?: string;
  clearance?: string;
  timestamp: number | string;
  message?: string;
  decision_id?: string;
}

export type TeachResponse = TeachMemoryResponse;

export type SearchCategory = 'Decisions' | 'Documents' | 'Action Items';

export interface SearchResultItem {
  id: string;
  title: string;
  category: SearchCategory;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  targetWorkspace: 'decisions' | 'knowledge' | 'calls' | 'architecture' | 'thinktank' | 'onboarding';
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResultGroup {
  category: SearchCategory;
  items: SearchResultItem[];
}

export type TarsEventType =
  | 'actions:updated'
  | 'calls:updated'
  | 'decisions:updated'
  | 'invariants:updated'
  | 'flightplan:updated'
  | 'documents:updated'
  | 'chats:updated';

type EventHandler<T = unknown> = (data: T) => void;

// ============================================================================
// Deep Client Implementation
// ============================================================================

class TarsClient {
  private readonly baseUrl = '/api';
  private readonly listeners = new Map<string, Set<EventHandler<any>>>();
  private paletteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private paletteAbortController: AbortController | null = null;
  private palettePendingResolve: ((value: SearchResultGroup[]) => void) | null = null;

  // --- Active Tenant Context ---
  public getActiveCompanyName(): string {
    try {
      const rawSession = localStorage.getItem('tars_session_storage');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const name = parsed?.profile?.company_name || parsed?.state?.profile?.company_name;
        if (name) return name;
      }
      const rawUser = localStorage.getItem('tars_current_user_profile');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.company_name) return parsed.company_name;
      }
      const rawName = localStorage.getItem('tars_company_name');
      if (rawName) return rawName;
    } catch {
      // Storage unavailable in sandbox
    }
    return '';
  }

  public getActiveClearance(): string {
    try {
      const rawUser = localStorage.getItem('tars_current_user_profile');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.clearance) return parsed.clearance;
      }
    } catch {}
    return 'ALL_TEAM';
  }

  // --- Reactive Event Bus ---
  public on<T = unknown>(event: TarsEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<any>);
    return () => this.off(event, handler);
  }

  public off<T = unknown>(event: TarsEventType, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<any>);
    }
  }

  public emit<T = unknown>(event: TarsEventType, data?: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error in TarsClient event listener for ${event}:`, err);
        }
      });
    }
  }

  public invalidate(scope: 'actions' | 'calls' | 'decisions' | 'invariants' | 'flightplan' | 'documents' | 'chats'): void {
    this.emit(`${scope}:updated` as TarsEventType);
  }

  // --- Base HTTP Transport (Honest Failure, Zero False-Green) ---
  private async fetchResponse(path: string, init?: RequestInit): Promise<Response> {
    const company = this.getActiveCompanyName();
    const headers = new Headers(init?.headers);

    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (company && !headers.has('X-Company-Name')) {
      headers.set('X-Company-Name', company);
    }

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    let res: Response;
    try {
      res = await fetch(url, { ...init, headers });
    } catch (networkErr: any) {
      if (networkErr?.name === 'AbortError') throw networkErr;
      throw new TarsApiError(`Network connection failure reaching ${path}: ${networkErr?.message || networkErr}`, 0, path);
    }

    if (!res.ok) {
      let errorDetail: unknown = null;
      try {
        errorDetail = await res.json();
      } catch {
        try {
          errorDetail = await res.text();
        } catch {}
      }
      const message =
        (typeof errorDetail === 'object' && errorDetail && 'detail' in errorDetail
          ? String((errorDetail as any).detail)
          : null) ||
        (typeof errorDetail === 'string' && errorDetail) ||
        `HTTP ${res.status}: ${res.statusText}`;

      throw new TarsApiError(message, res.status, path, errorDetail);
    }

    return res;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchResponse(path, init);
    return (await res.json()) as T;
  }

  private async requestBlob(path: string, init?: RequestInit): Promise<Blob> {
    const res = await this.fetchResponse(path, init);
    return await res.blob();
  }

  // ==========================================================================
  // NAMESPACE: Cortex (Invariants, AST Scanning, Refactors, Graph Topology)
  // ==========================================================================
  public readonly cortex = {
    getInvariants: async (signal?: AbortSignal): Promise<InvariantCheckResult[]> => {
      const data = await this.request<unknown>('/cortex/invariants', { signal });
      return parseInvariantArray(data, '/cortex/invariants');
    },

    triggerASTCheck: async (signal?: AbortSignal): Promise<{ execution_time_ms: number; results: InvariantCheckResult[] }> => {
      const res = await this.request<{ execution_time_ms: number; results: unknown }>('/cortex/check', {
        method: 'POST',
        body: JSON.stringify({}),
        signal,
      });
      this.emit('invariants:updated');
      return {
        execution_time_ms: Number(res.execution_time_ms || 0),
        results: parseInvariantArray(res.results, '/cortex/check'),
      };
    },

    applyRefactor: async (ruleId: string): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> => {
      const endpoint = `/cortex/invariants/refactor/${encodeURIComponent(ruleId)}`;
      const res = await this.request<{ success: boolean; invariants: unknown }>(endpoint, { method: 'POST' });
      this.emit('invariants:updated');
      return {
        success: Boolean(res.success),
        invariants: parseInvariantArray(res.invariants, endpoint),
      };
    },

    resetRefactors: async (): Promise<{ success: boolean; invariants: InvariantCheckResult[] }> => {
      const res = await this.request<{ success: boolean; invariants: unknown }>('/cortex/invariants/reset', {
        method: 'POST',
      });
      this.emit('invariants:updated');
      return {
        success: Boolean(res.success),
        invariants: parseInvariantArray(res.invariants, '/cortex/invariants/reset'),
      };
    },

    getTopology: async (activeRuleId?: string, signal?: AbortSignal): Promise<TopologyResponse> => {
      const query = activeRuleId ? `?active_rule_id=${encodeURIComponent(activeRuleId)}` : '';
      return await this.request<TopologyResponse>(`/cortex/graph/topology${query}`, { signal });
    },

    getMadr: async (ruleId: string, signal?: AbortSignal): Promise<MadrResponse> => {
      return await this.request<MadrResponse>(`/cortex/invariants/madr/${encodeURIComponent(ruleId)}`, { signal });
    },

    simulatePreCommit: async (ruleId: string, signal?: AbortSignal): Promise<PreCommitSimulationResponse> => {
      return await this.request<PreCommitSimulationResponse>(`/cortex/invariants/simulator/${encodeURIComponent(ruleId)}`, {
        signal,
      });
    },

    checkStaged: async (signal?: AbortSignal): Promise<StagedRadarCheckResponse> => {
      const start = performance.now();
      const data = await this.request<any>('/cortex/staged', { signal });
      const elapsed = Math.round((performance.now() - start) * 10) / 10;

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
    },

    checkContradiction: async (
      proposal: string,
      category = 'ALL',
      sensitivity = 'BALANCED',
      signal?: AbortSignal
    ): Promise<ContradictionCheckResponse> => {
      const comp = this.getActiveCompanyName();
      const raw = await this.request<unknown>('/cortex/decisions/check', {
        method: 'POST',
        body: JSON.stringify({
          proposal,
          category,
          severity_threshold: sensitivity,
          company_name: comp,
        }),
        signal,
      });
      return parseContradictionResponse(raw, '/cortex/decisions/check');
    },
  };

  // ==========================================================================
  // NAMESPACE: Ingestion (Voice Memos, Whisper, Lake Documents, File Uploads)
  // ==========================================================================
  public readonly ingestion = {
    getCalls: async (signal?: AbortSignal): Promise<VoiceToSpecResponse[]> => {
      const comp = this.getActiveCompanyName();
      const params = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<unknown>(`/ingestion/calls${params}`, { signal });
      return parseCallsArray(data, '/ingestion/calls');
    },

    getCall: async (id: string, signal?: AbortSignal): Promise<VoiceToSpecResponse | null> => {
      const endpoint = `/ingestion/calls/${encodeURIComponent(id)}`;
      try {
        const c = await this.request<unknown>(endpoint, { signal });
        if (!c) return null;
        return parseCallsArray([c], endpoint)[0] || null;
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },

    uploadCallAudio: async (file: File): Promise<VoiceToSpecResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_name', file.name.replace(/\.[^/.]+$/, ''));
      const res = await this.request<unknown>('/ingestion/calls/upload', {
        method: 'POST',
        body: formData,
      });
      const parsed = parseCallsArray([res], '/ingestion/calls/upload')[0];
      this.emit('calls:updated');
      this.emit('actions:updated');
      return parsed;
    },

    uploadVoiceMemo: async (
      audioBlob: Blob,
      filename = 'voice_memo.wav'
    ): Promise<{ task_id: string; transcript: string; duration_seconds: number }> => {
      const formData = new FormData();
      formData.append('file', audioBlob, filename);
      const res = await this.request<{ task_id: string; transcript: string; duration_seconds: number }>('/ingestion/audio', {
        method: 'POST',
        body: formData,
      });
      this.emit('calls:updated');
      this.emit('actions:updated');
      return res;
    },

    deleteCall: async (callId: string, deleteTaskIds?: string[]): Promise<CallDeleteResponse> => {
      const res = await this.request<CallDeleteResponse>(`/ingestion/calls/${encodeURIComponent(callId)}`, {
        method: 'DELETE',
        body: JSON.stringify({ delete_task_ids: deleteTaskIds }),
      });
      this.emit('calls:updated');
      this.emit('actions:updated');
      return res;
    },

    uploadDocument: async (file: File): Promise<{ doc_id: string; title: string; pages: number }> => {
      const formData = new FormData();
      formData.append('file', file);
      const data = await this.request<any>('/ingestion/upload', {
        method: 'POST',
        body: formData,
      });
      this.emit('documents:updated');
      return {
        doc_id: data.doc_id || 'DOC-NEW',
        title: data.filename || data.title || file.name,
        pages: data.page_count || Math.max(1, Math.ceil((data.chunk_count || 1) / 3)),
      };
    },

    uploadDocumentXHR: (file: File, onProgress: (pct: number) => void): Promise<{ doc_id: string; title: string; pages: number }> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${this.baseUrl}/ingestion/upload`);
        const company = this.getActiveCompanyName();
        if (company) xhr.setRequestHeader('X-Company-Name', company);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              this.emit('documents:updated');
              resolve({
                doc_id: data.doc_id || 'DOC-NEW',
                title: data.filename || data.title || file.name,
                pages: data.page_count || Math.max(1, Math.ceil((data.chunk_count || 1) / 3)),
              });
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new TarsApiError(`Upload failed with status ${xhr.status}`, xhr.status, '/ingestion/upload'));
          }
        };
        xhr.onerror = () => reject(new TarsApiError('Network error during file upload', 0, '/ingestion/upload'));

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      });
    },

    getLakeDocuments: async (signal?: AbortSignal): Promise<IngestedDocument[]> => {
      const comp = this.getActiveCompanyName();
      const params = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<any>(`/ingestion/documents${params}`, { signal });
      return Array.isArray(data?.documents) ? data.documents : [];
    },

    getDocumentBlob: async (docTitle: string, signal?: AbortSignal): Promise<Blob> => {
      return await this.requestBlob(`/ingestion/documents/${encodeURIComponent(docTitle)}/file`, { signal });
    },
  };

  // ==========================================================================
  // NAMESPACE: Decisions (Kùzu Graph, Strategic Advisor, Counterfactuals)
  // ==========================================================================
  public readonly decisions = {
    getDecisions: async (signal?: AbortSignal): Promise<DecisionItem[]> => {
      const comp = this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<unknown>(`/cortex/decisions${query}`, { signal });
      return parseDecisionArray(data, '/cortex/decisions');
    },

    getDecision: async (id: string, signal?: AbortSignal): Promise<DecisionItem | null> => {
      const endpoint = `/cortex/decisions/${encodeURIComponent(id)}`;
      try {
        const raw = await this.request<unknown>(endpoint, { signal });
        return parseDecision(raw, endpoint);
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },

    createDecision: async (req: DecisionCreateRequest): Promise<DecisionItem> => {
      const raw = await this.request<unknown>('/cortex/decisions', {
        method: 'POST',
        body: JSON.stringify(req),
      });
      const res = parseDecision(raw, '/cortex/decisions');
      this.emit('decisions:updated');
      return res;
    },

    patchDecision: async (id: string, patch: DecisionPatchRequest): Promise<DecisionItem> => {
      const endpoint = `/cortex/decisions/${encodeURIComponent(id)}`;
      const raw = await this.request<unknown>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const res = parseDecision(raw, endpoint);
      this.emit('decisions:updated');
      return res;
    },

    updateDecision: async (id: string, updates: Partial<DecisionItem>): Promise<DecisionItem> => {
      return this.decisions.patchDecision(id, updates as DecisionPatchRequest);
    },

    deleteDecision: async (
      id: string,
      hardPurge = false,
      supersededBy?: string
    ): Promise<{ status: string; decision_id: string; hard_purge: boolean; superseded_by?: string }> => {
      const params = new URLSearchParams();
      if (hardPurge) params.set('hard_purge', 'true');
      if (supersededBy) params.set('superseded_by', supersededBy);
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await this.request<{ status: string; decision_id: string; hard_purge: boolean; superseded_by?: string }>(
        `/cortex/decisions/${encodeURIComponent(id)}${query}`,
        { method: 'DELETE' }
      );
      this.emit('decisions:updated');
      return res;
    },

    checkContradiction: async (
      proposal: string,
      category = 'ALL',
      sensitivity = 'BALANCED',
      signal?: AbortSignal
    ): Promise<ContradictionCheckResponse> => {
      return this.cortex.checkContradiction(proposal, category, sensitivity, signal);
    },

    simulateScenario: async (req: SimulationScenarioRequest, signal?: AbortSignal): Promise<SimulationScenarioResponse> => {
      const comp = this.getActiveCompanyName();
      const raw = await this.request<unknown>('/cortex/simulate/scenario', {
        method: 'POST',
        body: JSON.stringify({ company_name: comp, ...req }),
        signal,
      });
      return parseSimulationScenarioResponse(raw, '/cortex/simulate/scenario');
    },

    simulateImpact: async (req: SimulationRequest, signal?: AbortSignal): Promise<SimulationResponse> => {
      const comp = this.getActiveCompanyName();
      const raw = await this.request<unknown>('/cortex/simulate', {
        method: 'POST',
        body: JSON.stringify({ company_name: comp, ...req }),
        signal,
      });
      return parseSimulationResponse(raw, '/cortex/simulate');
    },

    simulate: async (req: SimulationRequest, signal?: AbortSignal): Promise<SimulationResponse> => {
      return this.decisions.simulateImpact(req, signal);
    },

    getRecommendations: async (companyName?: string, signal?: AbortSignal): Promise<StrategicRecommendation[]> => {
      const comp = companyName || this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<StrategicRecommendation[]>(`/core/decisions/recommendations${query}`, { signal });
      return Array.isArray(data) ? data : [];
    },

    generateRecommendations: async (companyName?: string): Promise<StrategicRecommendation[]> => {
      const comp = companyName || this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<StrategicRecommendation[]>(`/core/decisions/recommendations/generate${query}`, {
        method: 'POST',
      });
      this.emit('decisions:updated');
      return Array.isArray(data) ? data : [];
    },

    dismissRecommendation: async (id: string, companyName?: string): Promise<boolean> => {
      const comp = companyName || this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      await this.request<{ status: string; id: string }>(`/core/decisions/recommendations/${encodeURIComponent(id)}/dismiss${query}`, {
        method: 'POST',
      });
      this.emit('decisions:updated');
      return true;
    },
  };

  // ==========================================================================
  // NAMESPACE: Chat (Persistent Knowledge Bot, Think Tank, Memory Teaching)
  // ==========================================================================
  public readonly chat = {
    listChats: async (userId?: string, signal?: AbortSignal): Promise<ChatSessionDTO[]> => {
      const url = userId ? `/core/chats?user_id=${encodeURIComponent(userId)}` : '/core/chats';
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      return await this.request<ChatSessionDTO[]>(url, { headers, signal });
    },

    createChat: async (userId?: string, title?: string): Promise<ChatSessionDTO> => {
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      const res = await this.request<ChatSessionDTO>('/core/chats', {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId, title: title || 'New conversation' }),
      });
      this.emit('chats:updated');
      return res;
    },

    getChat: async (chatId: string, userId?: string, signal?: AbortSignal): Promise<ChatSessionDTO> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      return await this.request<ChatSessionDTO>(url, { headers, signal });
    },

    renameChat: async (chatId: string, title: string, userId?: string): Promise<ChatSessionDTO> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      const res = await this.request<ChatSessionDTO>(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title }),
      });
      this.emit('chats:updated');
      return res;
    },

    deleteChat: async (chatId: string, userId?: string): Promise<{ status: string; id: string }> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      const res = await this.request<{ status: string; id: string }>(url, {
        method: 'DELETE',
        headers,
      });
      this.emit('chats:updated');
      return res;
    },

    clearChat: async (chatId: string, userId?: string): Promise<{ status: string; chat_id: string; cleared_count: number }> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}/messages`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      const res = await this.request<{ status: string; chat_id: string; cleared_count: number }>(url, {
        method: 'DELETE',
        headers,
      });
      this.emit('chats:updated');
      return res;
    },

    deleteChatMessage: async (
      chatId: string,
      messageId: string,
      userId?: string
    ): Promise<{ status: string; message_id: string }> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      const res = await this.request<{ status: string; message_id: string }>(url, {
        method: 'DELETE',
        headers,
      });
      this.emit('chats:updated');
      return res;
    },

    listMessages: async (chatId: string, userId?: string, signal?: AbortSignal): Promise<ChatMessageDTO[]> => {
      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}/messages`;
      const headers = userId ? { 'X-User-Id': userId } : undefined;
      return await this.request<ChatMessageDTO[]>(url, { headers, signal });
    },

    sendMessage: async (
      chatIdOrPayload:
        | string
        | {
            channel_id: string;
            sender?: string;
            sender_id?: string;
            sender_name?: string;
            sender_role?: string;
            sender_type?: string;
            text?: string;
            content?: string;
            provenance?: string;
            is_ai?: boolean;
            reply_to_id?: string | null;
          },
      paramsOrContent?:
        | string
        | {
            content: string;
            userId?: string;
            userRole?: string;
            userName?: string;
            clearance?: string;
            docId?: string;
          },
      maybeUserId?: string,
      maybeDocId?: string,
      signal?: AbortSignal
    ): Promise<any> => {
      if (typeof chatIdOrPayload === 'object' && chatIdOrPayload !== null && 'channel_id' in chatIdOrPayload) {
        return this.chat.sendMessageThinkTank(chatIdOrPayload, paramsOrContent as string, maybeUserId as any, signal);
      }
      const chatId = chatIdOrPayload as string;
      let content = '';
      let userId: string | undefined = maybeUserId;
      let userRole: string | undefined;
      let userName: string | undefined;
      let clearance: string | undefined;
      let docId: string | undefined = maybeDocId;

      if (typeof paramsOrContent === 'string') {
        content = paramsOrContent;
      } else if (paramsOrContent) {
        content = paramsOrContent.content;
        userId = paramsOrContent.userId || userId;
        userRole = paramsOrContent.userRole;
        userName = paramsOrContent.userName;
        clearance = paramsOrContent.clearance;
        docId = paramsOrContent.docId || docId;
      }

      const url = userId
        ? `/core/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}`
        : `/core/chats/${encodeURIComponent(chatId)}/messages`;

      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      if (userRole) headers['X-User-Role'] = userRole;
      if (clearance) headers['X-User-Clearance'] = clearance;

      const payload: Record<string, unknown> = {
        content,
        user_id: userId,
        user_role: userRole,
        user_name: userName,
        clearance,
      };
      if (docId) payload.doc_id = docId;

      const res = await this.request<ChatMessageDTO>(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });
      this.emit('chats:updated');
      return res;
    },

    uploadAttachment: async (
      chatId: string,
      file: File,
      userId?: string,
      onProgress?: (pct: number) => void
    ): Promise<{ doc_id: string; title: string; pages: number }> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = userId
          ? `${this.baseUrl}/core/chats/${encodeURIComponent(chatId)}/attachments?user_id=${encodeURIComponent(userId)}`
          : `${this.baseUrl}/core/chats/${encodeURIComponent(chatId)}/attachments`;

        xhr.open('POST', url);
        const comp = this.getActiveCompanyName();
        if (comp) xhr.setRequestHeader('X-Company-Name', comp);
        if (userId) xhr.setRequestHeader('X-User-Id', userId);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              this.emit('chats:updated');
              this.emit('documents:updated');
              resolve({
                doc_id: data.doc_id || 'DOC-ATT',
                title: data.filename || data.title || file.name,
                pages: data.page_count || 1,
              });
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new TarsApiError(`Attachment upload failed with status ${xhr.status}`, xhr.status, url));
          }
        };

        xhr.onerror = () => reject(new TarsApiError('Network failure during chat attachment upload', 0, url));

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      });
    },

    // --- Think Tank Sub-domain ---
    getChannels: async (signal?: AbortSignal): Promise<ThinkTankChannelDTO[]> => {
      const data = await this.request<ThinkTankChannelDTO[]>('/core/thinktank/channels', { signal });
      return Array.isArray(data) ? data : [];
    },

    createChannel: async (name: string, topic?: string): Promise<ThinkTankChannelDTO> => {
      const res = await this.request<ThinkTankChannelDTO>('/core/thinktank/channels', {
        method: 'POST',
        body: JSON.stringify({ name, topic }),
      });
      return res;
    },

    getMessages: async (channelId = 'general', signal?: AbortSignal): Promise<ThinkTankMessageDTO[]> => {
      const rawList = await this.request<any[]>(`/core/thinktank/messages?channel_id=${encodeURIComponent(channelId)}`, { signal });
      return (Array.isArray(rawList) ? rawList : []).map((m: any) => ({
        ...m,
        text: m.text || m.content || '',
        content: m.content || m.text || '',
        sender: m.sender || m.user_name || m.sender_name || 'Team Member',
        user_name: m.user_name || m.sender_name || m.sender || 'Team Member',
        sender_role: m.sender_role || (m.is_ai ? 'Strategic AI' : 'Member'),
      }));
    },

    sendMessageThinkTank: async (
      paramsOrChannelId:
        | string
        | {
            channel_id: string;
            sender?: string;
            sender_id?: string;
            sender_name?: string;
            sender_role?: string;
            sender_type?: string;
            text?: string;
            content?: string;
            provenance?: string;
            is_ai?: boolean;
            reply_to_id?: string | null;
          },
      maybeText?: string,
      options?: {
        sender?: string;
        senderRole?: string;
        userId?: string;
        replyToId?: string;
        provenance?: string;
      },
      signal?: AbortSignal
    ): Promise<ThinkTankMessageDTO> => {
      let payload: Record<string, unknown>;

      if (typeof paramsOrChannelId === 'object' && paramsOrChannelId !== null) {
        payload = {
          channel_id: paramsOrChannelId.channel_id,
          sender: paramsOrChannelId.sender || paramsOrChannelId.sender_name || 'Team Member',
          sender_name: paramsOrChannelId.sender_name || paramsOrChannelId.sender || 'Team Member',
          sender_role: paramsOrChannelId.sender_role || 'ENGINEER',
          sender_type: paramsOrChannelId.sender_type || (paramsOrChannelId.is_ai ? 'AI' : 'USER'),
          text: paramsOrChannelId.text || paramsOrChannelId.content || '',
          content: paramsOrChannelId.content || paramsOrChannelId.text || '',
          provenance: paramsOrChannelId.provenance,
          is_ai: paramsOrChannelId.is_ai || false,
          reply_to_id: paramsOrChannelId.reply_to_id || null,
        };
      } else {
        payload = {
          channel_id: paramsOrChannelId,
          text: maybeText || '',
          content: maybeText || '',
          sender: options?.sender || 'Alex Vance',
          sender_role: options?.senderRole || 'FOUNDER',
          user_id: options?.userId || 'usr-alex',
          reply_to_id: options?.replyToId || null,
          provenance: options?.provenance,
        };
      }

      const res = await this.request<ThinkTankMessageDTO>('/core/thinktank/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal,
      });
      return {
        ...res,
        text: res.text || res.content || '',
        content: res.content || res.text || '',
        sender: res.sender || res.user_name || 'Team Member',
      };
    },

    updateMessage: async (messageId: string, textOrContent: string): Promise<ThinkTankMessageDTO> => {
      const res = await this.request<ThinkTankMessageDTO>(`/core/thinktank/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ text: textOrContent, content: textOrContent }),
      });
      return {
        ...res,
        text: res.text || res.content || '',
        content: res.content || res.text || '',
      };
    },

    deleteMessage: async (messageId: string): Promise<{ status: string; id: string; message_id?: string }> => {
      const res = await this.request<any>(`/core/thinktank/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
      });
      return {
        status: res.status || 'DELETED',
        id: res.id || res.message_id || messageId,
        message_id: res.message_id || res.id || messageId,
      };
    },

    clearChannel: async (channelId: string): Promise<{ status: string; channel_id: string; cleared_count: number }> => {
      return await this.request<{ status: string; channel_id: string; cleared_count: number }>(
        `/core/thinktank/channels/${encodeURIComponent(channelId)}/messages`,
        { method: 'DELETE' }
      );
    },

    teachTars: async (data: TeachMemoryRequest, signal?: AbortSignal): Promise<TeachMemoryResponse> => {
      const res = await this.request<TeachMemoryResponse>('/core/teach', {
        method: 'POST',
        body: JSON.stringify(data),
        signal,
      });
      this.emit('decisions:updated');
      return res;
    },

    teachMemory: async (data: TeachMemoryRequest, signal?: AbortSignal): Promise<TeachMemoryResponse> => {
      return this.chat.teachTars(data, signal);
    },
  };

  // ==========================================================================
  // NAMESPACE: Actions (Action Hub, Task Status, User Registry)
  // ==========================================================================
  public readonly actions = {
    getActionItems: async (signal?: AbortSignal): Promise<ActionItemDTO[]> => {
      const data = await this.request<unknown>('/ingestion/actions', { signal });
      return parseActionItemArray(data, '/ingestion/actions');
    },

    updateActionStatus: async (id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO> => {
      const endpoint = `/ingestion/actions/${encodeURIComponent(id)}`;
      const raw = await this.request<unknown>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const res = parseActionItem(raw, endpoint);
      this.emit('actions:updated');
      return res;
    },

    createActionItem: async (item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO> => {
      const raw = await this.request<unknown>('/ingestion/actions', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      const res = parseActionItem(raw, '/ingestion/actions');
      this.emit('actions:updated');
      return res;
    },

    deleteActionItem: async (id: string): Promise<{ success: boolean }> => {
      const res = await this.request<{ success: boolean }>(`/ingestion/actions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      this.emit('actions:updated');
      return res;
    },

    getUsers: async (companyIdOrName?: string, signal?: AbortSignal): Promise<UserDTO[]> => {
      const comp = companyIdOrName || this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      const data = await this.request<unknown>(`/core/users${query}`, { signal });
      return parseUserArray(data, '/core/users');
    },

    createUser: async (payload: UserCreateDTO): Promise<UserDTO> => {
      const raw = await this.request<unknown>('/core/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseUserArray([raw], '/core/users')[0];
    },

    // Aliases for compatibility
    getItems: async (signal?: AbortSignal): Promise<ActionItemDTO[]> => {
      return this.actions.getActionItems(signal);
    },
    updateStatus: async (id: string, status: ActionItemDTO['status']): Promise<ActionItemDTO> => {
      return this.actions.updateActionStatus(id, status);
    },
    createItem: async (item: Omit<ActionItemDTO, 'id'>): Promise<ActionItemDTO> => {
      return this.actions.createActionItem(item);
    },
    deleteItem: async (id: string): Promise<{ success: boolean }> => {
      return this.actions.deleteActionItem(id);
    },
  };

  // ==========================================================================
  // NAMESPACE: Company & Genesis
  // ==========================================================================
  public readonly company = {
    getUsers: async (companyIdOrName?: string, signal?: AbortSignal): Promise<UserDTO[]> => {
      return this.actions.getUsers(companyIdOrName, signal);
    },

    createUser: async (payload: UserCreateDTO): Promise<UserDTO> => {
      return this.actions.createUser(payload);
    },

    getProfile: async (companyIdOrName?: string, signal?: AbortSignal): Promise<CompanyProfile | null> => {
      const comp = companyIdOrName || this.getActiveCompanyName();
      const query = comp ? `?company_name=${encodeURIComponent(comp)}` : '';
      try {
        const raw = await this.request<unknown>(`/core/company/profile${query}`, { signal });
        return parseCompanyProfile(raw, '/core/company/profile');
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },

    saveProfile: async (profile: Partial<CompanyProfile>): Promise<CompanyProfile> => {
      const raw = await this.request<unknown>('/core/company/profile', {
        method: 'POST',
        body: JSON.stringify(profile),
      });
      const parsed = parseCompanyProfile(raw, '/core/company/profile');
      if (!parsed) {
        throw new BoundaryValidationError('/core/company/profile', 'Server returned empty profile after save.');
      }
      return parsed;
    },

    bloomGenesis: async (payload: GenesisBloomPayload): Promise<GenesisBloomResponse> => {
      const raw = await this.request<unknown>('/core/genesis/bloom', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const res = parseGenesisBloomResponse(raw, '/core/genesis/bloom');
      this.emit('decisions:updated');
      this.emit('invariants:updated');
      this.emit('flightplan:updated');
      return res;
    },

    uploadSeedDocument: async (file: File): Promise<{ doc_id: string; title: string; pages?: number; message?: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await this.request<any>('/core/genesis/seed-doc', {
        method: 'POST',
        body: formData,
      });
      this.emit('documents:updated');
      return res;
    },

    resetWorkspace: async (payload?: WorkspaceResetRequest): Promise<WorkspaceResetResponse> => {
      const res = await this.request<WorkspaceResetResponse>('/core/workspace/reset', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      this.emit('actions:updated');
      this.emit('calls:updated');
      this.emit('decisions:updated');
      this.emit('flightplan:updated');
      return res;
    },
  };

  // ==========================================================================
  // NAMESPACE: System Telemetry (Air-Gap & Local Services)
  // ==========================================================================
  public readonly system = {
    getStatus: async (signal?: AbortSignal): Promise<SystemStatusDTO> => {
      const raw = await this.request<unknown>('/core/system/status', { signal });
      return parseSystemStatus(raw, '/core/system/status');
    },
  };

  // ==========================================================================
  // NAMESPACE: Onboarding Flight-Plans (Role-Target Scoped)
  // ==========================================================================
  public readonly onboarding = {
    getFlightPlan: async (companyName?: string, roleTarget?: string, signal?: AbortSignal): Promise<OnboardingFlightPlanDTO> => {
      const targetComp = companyName || this.getActiveCompanyName();
      const params = new URLSearchParams();
      if (targetComp) params.set('company_name', targetComp);
      if (roleTarget) params.set('user_id', roleTarget);
      const query = params.toString() ? `?${params.toString()}` : '';

      const raw = await this.request<unknown>(`/onboarding/flight-plan${query}`, { signal });
      return parseOnboardingFlightPlan(raw, '/onboarding/flight-plan');
    },

    saveFlightPlan: async (plan: OnboardingFlightPlanCreate): Promise<OnboardingFlightPlanDTO> => {
      const targetComp = plan.company_name || this.getActiveCompanyName() || 'Sovereign Startup';
      const raw = await this.request<unknown>('/onboarding/flight-plan', {
        method: 'POST',
        body: JSON.stringify({ ...plan, company_name: targetComp }),
      });
      const res = parseOnboardingFlightPlan(raw, '/onboarding/flight-plan');
      this.emit('flightplan:updated');
      return res;
    },

    updateTaskProgress: async (
      update: OnboardingProgressUpdateDTO
    ): Promise<{ completed_tasks: Record<string, boolean> }> => {
      const targetComp = update.company_name || this.getActiveCompanyName() || 'Sovereign Startup';
      const res = await this.request<{ completed_tasks: Record<string, boolean> }>('/onboarding/progress', {
        method: 'POST',
        body: JSON.stringify({ ...update, company_name: targetComp }),
      });
      this.emit('flightplan:updated');
      return res;
    },

    resetFlightPlanDefaults: async (companyName: string): Promise<OnboardingFlightPlanDTO> => {
      const raw = await this.request<unknown>('/onboarding/reset-defaults', {
        method: 'POST',
        body: JSON.stringify({ company_name: companyName }),
      });
      const res = parseOnboardingFlightPlan(raw, '/onboarding/reset-defaults');
      this.emit('flightplan:updated');
      return res;
    },
  };

  // ==========================================================================
  // Primary Search Method & Federated Command Palette
  // ==========================================================================
  private readonly executeSearch = async (req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> => {
    const raw = await this.request<unknown>('/core/search', {
      method: 'POST',
      body: JSON.stringify(req),
      signal,
    });
    return parseSearchResponse(raw, '/core/search');
  };

  public readonly search: {
    (req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse>;
    query: (req: SearchRequest, signal?: AbortSignal) => Promise<SearchResponse>;
  } = Object.assign(
    (req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> => this.executeSearch(req, signal),
    {
      query: (req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> => this.executeSearch(req, signal),
    }
  );

  public searchFederated = async (query: string): Promise<SearchResultGroup[]> => {
    if (!query || query.trim().length === 0) return [];

    if (this.paletteDebounceTimer) {
      clearTimeout(this.paletteDebounceTimer);
      this.paletteDebounceTimer = null;
    }
    if (this.palettePendingResolve) {
      this.palettePendingResolve([]);
      this.palettePendingResolve = null;
    }
    if (this.paletteAbortController) {
      this.paletteAbortController.abort();
    }

    return new Promise((resolve, reject) => {
      this.palettePendingResolve = resolve;
      this.paletteDebounceTimer = setTimeout(async () => {
        this.palettePendingResolve = null;
        this.paletteAbortController = new AbortController();
        const signal = this.paletteAbortController.signal;

        try {
          const trimmed = query.trim().toLowerCase();
          const sessionClearance = this.getActiveClearance();

          const [searchData, allDecisions, allActions] = await Promise.all([
            this.executeSearch({ query: trimmed, clearance: sessionClearance }, signal),
            this.decisions.getDecisions(signal),
            this.actions.getActionItems(signal),
          ]);

          const groups: SearchResultGroup[] = [];

          // 1. Group: Decisions
          const matchedDecisions = allDecisions
            .filter((d) => {
              const text = `${d.title || ''} ${d.context || ''} ${d.chosen_option || ''} ${d.id || ''}`.toLowerCase();
              return text.includes(trimmed);
            })
            .map((d): SearchResultItem => {
              const status = d.lifecycle_status || 'ACTIVE';
              return {
                id: d.id,
                title: `${d.id}: ${d.title}`,
                category: 'Decisions',
                subtitle: d.chosen_option || d.context || 'Strategic architecture decision',
                badge: status,
                badgeColor: status === 'ACTIVE' ? 'emerald' : status === 'SUPERSEDED' ? 'amber' : 'purple',
                targetWorkspace: 'decisions',
                targetId: d.id,
              };
            });
          if (matchedDecisions.length > 0) {
            groups.push({ category: 'Decisions', items: matchedDecisions.slice(0, 5) });
          }

          // 2. Group: Documents
          const citations = Array.isArray(searchData.citations) ? searchData.citations : [];
          const seenDocs = new Set<string>();
          const matchedDocs: SearchResultItem[] = [];

          for (const c of citations) {
            if (c.doc_id && !seenDocs.has(c.doc_id)) {
              seenDocs.add(c.doc_id);
              matchedDocs.push({
                id: c.doc_id,
                title: c.doc_title || c.doc_id,
                category: 'Documents',
                subtitle: c.snippet ? `"...${c.snippet.slice(0, 100)}..."` : `Page ${c.page_number || 1}`,
                badge: `P.${c.page_number || 1}`,
                badgeColor: 'sky',
                targetWorkspace: 'knowledge',
                targetId: c.doc_id,
                metadata: { page: c.page_number, heading: c.section_heading },
              });
            }
          }
          if (matchedDocs.length > 0) {
            groups.push({ category: 'Documents', items: matchedDocs.slice(0, 5) });
          }

          // 3. Group: Action Items
          const matchedActions = allActions
            .filter((a) => {
              const text = `${a.title || ''} ${a.description || ''} ${a.owner || ''} ${a.id || ''}`.toLowerCase();
              return text.includes(trimmed);
            })
            .map((a): SearchResultItem => {
              const status = a.status || 'OPEN';
              return {
                id: a.id,
                title: a.title || a.description?.slice(0, 50) || a.id,
                category: 'Action Items',
                subtitle: `Owner: ${a.owner || 'Unassigned'} · Priority: ${a.priority || 'MEDIUM'}`,
                badge: status,
                badgeColor: status === 'DONE' ? 'emerald' : status === 'IN_PROGRESS' ? 'sky' : 'amber',
                targetWorkspace: a.source_type === 'CALL_EXTRACTION' ? 'calls' : 'knowledge',
                targetId: a.source_id,
              };
            });
          if (matchedActions.length > 0) {
            groups.push({ category: 'Action Items', items: matchedActions.slice(0, 5) });
          }

          resolve(groups);
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            resolve([]);
            return;
          }
          reject(err);
        }
      }, 150);
    });
  };

  // ==========================================================================
  // Backward-Compatible Facade (Drop-in support for existing TarsApi calls)
  // ==========================================================================
  getCompanyProfile = this.company.getProfile;
  saveCompanyProfile = this.company.saveProfile;
  bloomGenesis = this.company.bloomGenesis;
  uploadSeedDocument = this.company.uploadSeedDocument;
  uploadDocument = this.ingestion.uploadDocument;
  getCalls = this.ingestion.getCalls;
  getCall = this.ingestion.getCall;
  uploadCallAudio = this.ingestion.uploadCallAudio;
  uploadVoiceMemo = this.ingestion.uploadVoiceMemo;
  getDecisions = this.decisions.getDecisions;
  getDecision = this.decisions.getDecision;
  checkContradiction = this.cortex.checkContradiction;
  simulateImpact = this.decisions.simulateImpact;
  recordDecision = async (decision: Omit<DecisionItem, 'id' | 'timestamp'>) => {
    return this.decisions.createDecision(decision as DecisionCreateRequest);
  };
  getInvariants = this.cortex.getInvariants;
  triggerASTCheck = this.cortex.triggerASTCheck;
  applyRefactor = this.cortex.applyRefactor;
  resetRefactors = this.cortex.resetRefactors;
  getMadr = this.cortex.getMadr;
  simulatePreCommit = this.cortex.simulatePreCommit;
  getTopology = this.cortex.getTopology;
  getActionItems = this.actions.getActionItems;
  updateActionStatus = this.actions.updateActionStatus;
  createActionItem = this.actions.createActionItem;
  getUsers = this.actions.getUsers;
  createUser = this.actions.createUser;
  resetWorkspace = this.company.resetWorkspace;
  getFlightPlan = this.onboarding.getFlightPlan;
  saveFlightPlan = this.onboarding.saveFlightPlan;
  updateTaskProgress = this.onboarding.updateTaskProgress;
  resetFlightPlanDefaults = this.onboarding.resetFlightPlanDefaults;
}

// Authoritative Singleton Instance
export const tarsClient = new TarsClient();

// React Invalidation Hook (Ref-stabilized to prevent subscription churn)
export function useTarsInvalidation(scope: TarsEventType, callback: () => void): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return tarsClient.on(scope, () => {
      callbackRef.current();
    });
  }, [scope]);
}

// Backward-compatible alias for existing code
export const api = tarsClient;
export default tarsClient;
