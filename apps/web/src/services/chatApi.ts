// apps/web/src/services/chatApi.ts
/**
 * Track 3: Think Tank Chat & Knowledge Teaching Service
 * Exclusive frontend service decoupled from liveApi.ts.
 */

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  reply_to_id?: string | null;
  is_edited: boolean;
  created_at: string;
}

export interface TeachResponse {
  memory_id: string;
  status: string;
  timestamp: string;
}

const API_BASE = '/api/core';

export const chatApi = {
  /**
   * Fetches persisted messages for a specific channel
   */
  async getMessages(channelId: string = 'general', signal?: AbortSignal): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`${API_BASE}/thinktank/messages?channel_id=${encodeURIComponent(channelId)}`, { signal });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  /**
   * Sends a new message in a Think Tank channel
   */
  async sendMessage(params: {
    channel_id: string;
    content: string;
    sender_id?: string;
    sender_name?: string;
    sender_role?: string;
    reply_to_id?: string | null;
  }): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/thinktank/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
    return res.json();
  },

  /**
   * Edits an existing chat message
   */
  async updateMessage(messageId: string, content: string): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Failed to update message: ${res.statusText}`);
    return res.json();
  },

  /**
   * Deletes a chat message
   */
  async deleteMessage(messageId: string): Promise<{ status: string; message_id: string }> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete message: ${res.statusText}`);
    return res.json();
  },

  /**
   * Directly teaches TARS an organizational fact, rule, or guideline (Bug 20)
   */
  async teachMemory(params: {
    content: string;
    title?: string;
    category?: string;
    clearance?: string;
  }): Promise<TeachResponse> {
    const res = await fetch(`${API_BASE}/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to teach TARS: ${res.statusText}`);
    return res.json();
  },
};
