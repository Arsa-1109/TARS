// apps/web/src/services/commandPaletteApi.ts
/**
 * Federated Command Palette API Service (Track 4).
 * Combines Kùzu DB Decisions, Knowledge Lake Documents, and SQLite Action Items
 * with 150ms internal debounce and categorised result projection.
 */

export type SearchCategory = 'Decisions' | 'Documents' | 'Action Items';

export interface SearchResultItem {
  id: string;
  title: string;
  category: SearchCategory;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  targetWorkspace: 'decisions' | 'knowledge' | 'calls' | 'thinktank' | 'onboarding';
  targetId?: string;
  metadata?: Record<string, any>;
}

export interface SearchResultGroup {
  category: SearchCategory;
  items: SearchResultItem[];
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeAbortController: AbortController | null = null;

export class CommandPaletteApiService {
  /**
   * Performs debounced federated search across Kùzu decisions, document lake, and action items.
   */
  async searchFederated(query: string): Promise<SearchResultGroup[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (activeAbortController) {
      activeAbortController.abort();
    }

    return new Promise((resolve) => {
      debounceTimer = setTimeout(async () => {
        activeAbortController = new AbortController();
        const signal = activeAbortController.signal;

        try {
          const trimmed = query.trim().toLowerCase();

          // Resolve session profile for authoritative clearance (Item 128)
          let sessionClearance = 'ALL_TEAM';
          try {
            const rawProfile = localStorage.getItem('tars_current_user_profile');
            if (rawProfile) {
              const parsed = JSON.parse(rawProfile);
              sessionClearance = parsed.clearance || 'ALL_TEAM';
            }
          } catch {
            // fallback
          }

          // Concurrently fetch from Core Search, Cortex Decisions, and Canonical Action Hub
          const [searchRes, decisionsRes, actionsRes] = await Promise.allSettled([
            fetch('/api/core/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: trimmed, clearance: sessionClearance }),
              signal,
            }).then((r) => (r.ok ? r.json() : { citations: [] })),

            fetch('/api/cortex/decisions', { signal }).then((r) =>
              r.ok ? r.json() : []
            ),

            // Item 127: Canonical Action Hub route
            fetch('/api/core/action_hub', { signal })
              .then((r) => (r && r.ok ? r.json() : [])),
          ]);

          const groups: SearchResultGroup[] = [];

          // 1. Group: Decisions (Kùzu DB)
          const allDecisions = decisionsRes.status === 'fulfilled' ? decisionsRes.value : [];
          const matchedDecisions = (Array.isArray(allDecisions) ? allDecisions : [])
            .filter((d: any) => {
              const text = `${d.title || ''} ${d.context || ''} ${d.chosen_option || ''} ${d.id || ''}`.toLowerCase();
              return text.includes(trimmed);
            })
            .map((d: any): SearchResultItem => {
              const status = d.lifecycle_status || d.status || 'ACTIVE';
              return {
                id: d.id,
                title: `${d.id}: ${d.title}`,
                category: 'Decisions',
                subtitle: d.chosen_option || d.context || 'Strategic architecture decision',
                badge: status,
                badgeColor: status === 'ACTIVE' ? 'emerald' : 'amber',
                targetWorkspace: 'decisions',
                targetId: d.id,
              };
            });

          if (matchedDecisions.length > 0) {
            groups.push({ category: 'Decisions', items: matchedDecisions });
          }

          // 2. Group: Documents (Knowledge Lake)
          const searchData = searchRes.status === 'fulfilled' ? searchRes.value : {};
          const citations = searchData.citations || searchData.results || [];
          const matchedDocs = (Array.isArray(citations) ? citations : []).map(
            (c: any): SearchResultItem => ({
              id: c.doc_id || c.id || `doc-${Math.random()}`,
              title: c.doc_title || c.title || 'Document Chunk',
              category: 'Documents',
              subtitle: c.snippet || c.content || 'Knowledge base citation',
              badge: c.department || 'Knowledge',
              badgeColor: 'blue',
              targetWorkspace: 'knowledge',
              targetId: c.doc_id || c.id,
            })
          );

          if (matchedDocs.length > 0) {
            groups.push({ category: 'Documents', items: matchedDocs });
          }

          // 3. Group: Action Items (SQLite)
          const allActions = actionsRes.status === 'fulfilled' ? actionsRes.value : [];
          const matchedActions = (Array.isArray(allActions) ? allActions : [])
            .filter((a: any) => {
              const text = `${a.title || ''} ${a.description || ''} ${a.owner || ''}`.toLowerCase();
              return text.includes(trimmed);
            })
            .map((a: any): SearchResultItem => ({
              id: a.id,
              title: a.title || 'Action Commitment',
              category: 'Action Items',
              subtitle: `${a.owner ? `Assignee: ${a.owner} · ` : ''}${a.description || ''}`,
              badge: a.priority || a.status || 'OPEN',
              badgeColor: a.priority === 'HIGH' ? 'red' : 'indigo',
              targetWorkspace: 'calls',
              targetId: a.id,
            }));

          if (matchedActions.length > 0) {
            groups.push({ category: 'Action Items', items: matchedActions });
          }

          resolve(groups);
        } catch {
          resolve([]);
        }
      }, 150);
    });
  }
}

export const commandPaletteApi = new CommandPaletteApiService();
