// apps/web/src/services/ingestionApi.ts
/**
 * Track 2: Ingestion Hub & Call Studio Domain Service
 * Exclusive frontend service decoupled from liveApi.ts to ensure zero git merge conflicts.
 */
import { VoiceToSpecResponse } from '../types/contracts';

const API_BASE = '/api';

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

export const ingestionApi = {
  /**
   * Uploads a document with determinate XHR progress tracking (Bug 12)
   */
  uploadDocumentXHR(file: File, onProgress: (pct: number) => void): Promise<{ doc_id: string; title: string; pages: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/ingestion/upload`);
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
            resolve({
              doc_id: data.doc_id || 'DOC-NEW',
              title: data.filename || data.title || file.name,
              pages: data.page_count || Math.max(1, Math.ceil((data.chunk_count || 1) / 3)),
            });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during file upload'));
      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  },

  /**
   * Retrieves all processed and active customer calls
   */
  async getCalls(signal?: AbortSignal): Promise<VoiceToSpecResponse[]> {
    try {
      const res = await fetch(`${API_BASE}/ingestion/calls`, {
        signal,
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const rawCalls = Array.isArray(data) ? data : (data && Array.isArray(data.calls) ? data.calls : []);
      if (rawCalls.length === 0) return [];

      return rawCalls.map((c: any): VoiceToSpecResponse => {
        const callId = c.call_id || c.task_id || `CALL-${Math.random().toString(36).slice(2, 8)}`;
        const clientName = c.client_name || c.filename || 'Voice Memo';
        const transcriptText = c.transcript_text || (typeof c.transcript === 'string' ? c.transcript : '') || c.transcript_snippet || '';

        let transcriptArray: { speaker: string; timestamp: string; seconds: number; text: string }[] = [];
        if (Array.isArray(c.transcript) && c.transcript.length > 0) {
          transcriptArray = c.transcript.map((t: any) => ({
            speaker: t.speaker || clientName,
            timestamp: t.timestamp || '00:00',
            seconds: typeof t.seconds === 'number' ? t.seconds : 0,
            text: t.text || '',
          }));
        } else if (transcriptText) {
          transcriptArray = [
            {
              speaker: clientName,
              timestamp: '00:00',
              seconds: 0,
              text: transcriptText,
            },
          ];
        }

        const dateStr = c.created_at
          ? new Date(c.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (c.recorded_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        return {
          call_id: callId,
          client_name: clientName,
          sentiment: c.sentiment || 'NEUTRAL',
          summary: c.summary || (transcriptText ? `Transcription: "${transcriptText.slice(0, 160)}..."` : 'Voice memo recording.'),
          pain_points: Array.isArray(c.pain_points) ? c.pain_points : [],
          feature_requests: Array.isArray(c.feature_requests) ? c.feature_requests : [],
          commitments: Array.isArray(c.commitments) ? c.commitments : [],
          audio_duration_seconds: Math.round(c.audio_duration_seconds || c.duration_seconds || 15),
          recorded_at: dateStr,
          transcript: transcriptArray,
        };
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return [];
      console.warn('ingestionApi.getCalls warning:', err);
      return [];
    }
  },

  /**
   * Retrieves single call by ID
   */
  async getCall(id: string, signal?: AbortSignal): Promise<VoiceToSpecResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/ingestion/calls/${id}`, { signal });
      if (!res.ok) return null;
      const c = await res.json();
      const callId = c.call_id || c.task_id || id;
      const clientName = c.client_name || c.filename || 'Voice Memo';
      const transcriptText = c.transcript_text || (typeof c.transcript === 'string' ? c.transcript : '') || '';

      let transcriptArray: { speaker: string; timestamp: string; seconds: number; text: string }[] = [];
      if (Array.isArray(c.transcript)) {
        transcriptArray = c.transcript.map((t: any) => ({
          speaker: t.speaker || clientName,
          timestamp: t.timestamp || '00:00',
          seconds: typeof t.seconds === 'number' ? t.seconds : 0,
          text: t.text || '',
        }));
      } else if (transcriptText) {
        transcriptArray = [{ speaker: clientName, timestamp: '00:00', seconds: 0, text: transcriptText }];
      }

      return {
        call_id: callId,
        client_name: clientName,
        sentiment: c.sentiment || 'NEUTRAL',
        summary: c.summary || 'Call audio analysis completed.',
        pain_points: Array.isArray(c.pain_points) ? c.pain_points : [],
        feature_requests: Array.isArray(c.feature_requests) ? c.feature_requests : [],
        commitments: Array.isArray(c.commitments) ? c.commitments : [],
        audio_duration_seconds: Math.round(c.audio_duration_seconds || c.duration_seconds || 15),
        recorded_at: c.recorded_at || 'Just now',
        transcript: transcriptArray,
      };
    } catch {
      return null;
    }
  },

  /**
   * Uploads call audio recording for Whisper transcription & spec extraction
   */
  async uploadCallAudio(file: File): Promise<VoiceToSpecResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_name', file.name.replace(/\.[^/.]+$/, ''));
    const res = await fetch(`${API_BASE}/ingestion/calls/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Audio upload failed: ${res.statusText}`);
    return res.json();
  },

  /**
   * Deletes a recorded call, raw audio file, and selectively prunes Action Hub items (Bug 19)
   */
  async deleteCall(callId: string, deleteTaskIds?: string[]): Promise<CallDeleteResponse> {
    const res = await fetch(`${API_BASE}/ingestion/calls/${encodeURIComponent(callId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete_task_ids: deleteTaskIds }),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete call recording (${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetches ingested documents lake with metadata
   */
  async getLakeDocuments(signal?: AbortSignal): Promise<IngestedDocument[]> {
    try {
      const res = await fetch(`${API_BASE}/ingestion/documents`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.documents) ? data.documents : [];
    } catch {
      return [];
    }
  },
};
