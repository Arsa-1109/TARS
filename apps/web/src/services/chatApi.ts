/**
 * apps/web/src/services/chatApi.ts
 * Track 3: Core Storage, Think Tank Persistence & Explicit Teaching API client.
 */

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
  provenance?: string;
  is_ai?: boolean;
  is_edited?: boolean;
  created_at?: string;
  updated_at?: string;
}

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
  title: string;
  clearance: string;
  timestamp: number;
  message: string;
}

const API_BASE = '/api/core';

export const chatApi = {
  /**
   * Retrieves all persistent Think Tank channels.
   */
  async getChannels(): Promise<ThinkTankChannelDTO[]> {
    try {
      const res = await fetch(`${API_BASE}/thinktank/channels`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch channels from live backend, fallback to default:', err);
      return [
        { id: 'general', name: '#general', topic: 'Company strategic alignment & cross-functional topics' },
        { id: 'strategy', name: '#strategy', topic: 'Fundraising, board discussions, and runway projections' },
        { id: 'architecture', name: '#architecture', topic: 'Core invariants, database schema evolutions, and refactors' },
      ];
    }
  },

  /**
   * Creates a new channel.
   */
  async createChannel(name: string, topic?: string): Promise<ThinkTankChannelDTO> {
    const res = await fetch(`${API_BASE}/thinktank/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, topic }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Retrieves persistent messages for a specific channel.
   */
  async getMessages(channelId: string): Promise<ThinkTankMessageDTO[]> {
    try {
      const res = await fetch(`${API_BASE}/thinktank/messages?channel_id=${encodeURIComponent(channelId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`Failed to fetch messages for channel ${channelId}:`, err);
      return [];
    }
  },

  /**
   * Persists a message to a channel.
   */
  async sendMessage(msg: {
    channel_id: string;
    sender: string;
    sender_role?: string;
    sender_type?: string;
    text: string;
    provenance?: string;
    is_ai?: boolean;
  }): Promise<ThinkTankMessageDTO> {
    const res = await fetch(`${API_BASE}/thinktank/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Edits an existing message.
   */
  async updateMessage(messageId: string, text: string): Promise<ThinkTankMessageDTO> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Soft-deletes a message.
   */
  async deleteMessage(messageId: string): Promise<{ status: string; id: string }> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Clears all messages in a channel.
   */
  async clearChannel(channelId: string): Promise<{ status: string; channel_id: string; cleared_count: number }> {
    const res = await fetch(`${API_BASE}/thinktank/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Explicitly teaches TARS institutional knowledge.
   */
  async teachTars(data: TeachMemoryRequest): Promise<TeachMemoryResponse> {
    const res = await fetch(`${API_BASE}/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },
};
