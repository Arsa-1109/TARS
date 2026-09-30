// apps/web/src/services/realtime.ts
/**
 * Real-time Event Bus for LAN Peer State Synchronization.
 * Consumes the /api/ingestion/events/stream SSE feed and fans out
 * state invalidation notifications across all open browser sessions.
 */

export interface RealtimeEvent {
  event: string;
  data: any;
  timestamp: number;
}

type RealtimeCallback = (event: RealtimeEvent) => void;

class RealtimeEventBus {
  private eventSource: EventSource | null = null;
  private listeners: Set<RealtimeCallback> = new Set();
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public connect(): void {
    if (this.eventSource || this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.eventSource = new EventSource('/api/ingestion/events/stream');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        console.log('[TARS Realtime] Connected to live SSE event stream');
      };

      this.eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.notify(parsed);
        } catch {
          // ignore non-json
        }
      };

      const eventTypes = [
        'DECISION_MUTATION',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_PROCESSED',
        'ACTION_ITEM_MUTATION',
        'THINKTANK_MESSAGE',
        'TRANSCRIPTION_COMPLETED',
        'CALL_DELETED',
        'DROP_EVENT',
      ];

      eventTypes.forEach((type) => {
        this.eventSource?.addEventListener(type, (e: any) => {
          try {
            const parsed = JSON.parse(e.data);
            this.notify(parsed);
          } catch {
            // ignore
          }
        });
      });

      this.eventSource.onerror = () => {
        this.disconnect();
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  public subscribe(cb: RealtimeCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(event: RealtimeEvent): void {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[TARS Realtime] Listener error:', err);
      }
    });
  }
}

export const realtimeBus = new RealtimeEventBus();
