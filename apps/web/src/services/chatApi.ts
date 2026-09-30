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
}

export type TeachResponse = TeachMemoryResponse;

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
  async getMessages(channelId: string = 'general', signal?: AbortSignal): Promise<ThinkTankMessageDTO[]> {
    try {
      const res = await fetch(`${API_BASE}/thinktank/messages?channel_id=${encodeURIComponent(channelId)}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawList = await res.json();
      return rawList.map((m: any) => ({
        ...m,
        text: m.text || m.content || '',
        content: m.content || m.text || '',
        sender: m.sender || m.user_name || m.sender_name || 'Team Member',
        user_name: m.user_name || m.sender_name || m.sender || 'Team Member',
      }));
    } catch (err) {
      console.warn(`Failed to fetch messages for channel ${channelId}:`, err);
      return [];
    }
  },

  /**
   * Persists a message to a channel.
   */
  async sendMessage(params: {
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
  }): Promise<ThinkTankMessageDTO> {
    const payload = {
      channel_id: params.channel_id,
      sender: params.sender || params.sender_name || 'Team Member',
      sender_name: params.sender_name || params.sender || 'Team Member',
      sender_role: params.sender_role || 'ENGINEER',
      sender_type: params.sender_type || (params.is_ai ? 'AI' : 'USER'),
      text: params.text || params.content || '',
      content: params.content || params.text || '',
      provenance: params.provenance,
      is_ai: params.is_ai || false,
      reply_to_id: params.reply_to_id || null,
    };
    const res = await fetch(`${API_BASE}/thinktank/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      text: data.text || data.content || '',
      content: data.content || data.text || '',
      sender: data.sender || data.user_name || 'Team Member',
    };
  },

  /**
   * Edits an existing message.
   */
  async updateMessage(messageId: string, textOrContent: string): Promise<ThinkTankMessageDTO> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textOrContent, content: textOrContent }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      text: data.text || data.content || '',
      content: data.content || data.text || '',
    };
  },

  /**
   * Soft-deletes a message.
   */
  async deleteMessage(messageId: string): Promise<{ status: string; id: string; message_id?: string }> {
    const res = await fetch(`${API_BASE}/thinktank/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      status: data.status || 'DELETED',
      id: data.id || data.message_id || messageId,
      message_id: data.message_id || data.id || messageId,
    };
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

  /**
   * Direct teach alias.
   */
  async teachMemory(data: TeachMemoryRequest): Promise<TeachMemoryResponse> {
    return this.teachTars(data);
  },
};

export { knowledgeChatApi } from './knowledgeChatApi';
