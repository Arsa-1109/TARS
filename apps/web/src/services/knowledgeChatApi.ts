/**
 * apps/web/src/services/knowledgeChatApi.ts
 * Dedicated API client for Persistent Company Knowledge Chatbot
 */
import { ChatSessionDTO, ChatMessageDTO } from '../types/contracts';

const API_BASE = '/api/core';

export const knowledgeChatApi = {
  /**
   * Retrieves all chat sessions owned by the active user.
   */
  async listChats(userId?: string): Promise<ChatSessionDTO[]> {
    const url = userId ? `${API_BASE}/chats?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/chats`;
    const res = await fetch(url, {
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Creates a new persistent conversation.
   */
  async createChat(userId?: string, title?: string): Promise<ChatSessionDTO> {
    const res = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
      },
      body: JSON.stringify({ user_id: userId, title: title || 'New conversation' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Retrieves a single chat session.
   */
  async getChat(chatId: string, userId?: string): Promise<ChatSessionDTO> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}`;
    const res = await fetch(url, {
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Renames a chat session.
   */
  async renameChat(chatId: string, title: string, userId?: string): Promise<ChatSessionDTO> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Deletes a chat session (soft-delete).
   */
  async deleteChat(chatId: string, userId?: string): Promise<{ status: string; id: string }> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Retrieves persistent message history for a conversation.
   */
  async listMessages(chatId: string, userId?: string): Promise<ChatMessageDTO[]> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`;
    const res = await fetch(url, {
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Sends a user prompt and retrieves grounded assistant response with citations.
   */
  async sendMessage(
    chatId: string,
    params: {
      content: string;
      userId?: string;
      userRole?: string;
      userName?: string;
      clearance?: string;
    }
  ): Promise<ChatMessageDTO> {
    const url = params.userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(params.userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(params.userId ? { 'X-User-Id': params.userId } : {}),
        ...(params.userRole ? { 'X-User-Role': params.userRole } : {}),
        ...(params.clearance ? { 'X-User-Clearance': params.clearance } : {}),
      },
      body: JSON.stringify({
        content: params.content,
        user_id: params.userId,
        user_role: params.userRole,
        user_name: params.userName,
        clearance: params.clearance,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Clears all message history in a conversation without deleting the chat.
   */
  async clearChat(chatId: string, userId?: string): Promise<{ status: string; chat_id: string; cleared_count: number }> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Deletes an individual message.
   */
  async deleteMessage(chatId: string, messageId: string, userId?: string): Promise<{ status: string; message_id: string }> {
    const url = userId
      ? `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: userId ? { 'X-User-Id': userId } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },
};
