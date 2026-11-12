// apps/web/src/services/knowledgeChatApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.chat)
 */
import { tarsClient } from './tarsClient';

export const knowledgeChatApi = {
  listChats: tarsClient.chat.listChats,
  createChat: tarsClient.chat.createChat,
  getChat: tarsClient.chat.getChat,
  renameChat: tarsClient.chat.renameChat,
  deleteChat: tarsClient.chat.deleteChat,
  clearChat: tarsClient.chat.clearChat,
  deleteMessage: tarsClient.chat.deleteChatMessage,
  listMessages: tarsClient.chat.listMessages,
  sendMessage: (chatId: string, params: any) => tarsClient.chat.sendMessage(chatId, params),
  uploadAttachment: tarsClient.chat.uploadAttachment,
};

export default knowledgeChatApi;
