// apps/web/src/services/chatApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.chat)
 */
import { tarsClient } from './tarsClient';

export type {
  ThinkTankChannelDTO,
  ThinkTankMessageDTO,
  ChatMessage,
  TeachMemoryRequest,
  TeachMemoryResponse,
  TeachResponse,
} from './tarsClient';

export const chatApi = {
  getChannels: tarsClient.chat.getChannels,
  createChannel: tarsClient.chat.createChannel,
  getMessages: tarsClient.chat.getMessages,
  sendMessage: (params: any) => tarsClient.chat.sendMessageThinkTank(params),
  updateMessage: tarsClient.chat.updateMessage,
  deleteMessage: tarsClient.chat.deleteMessage,
  clearChannel: tarsClient.chat.clearChannel,
  teachTars: tarsClient.chat.teachTars,
  teachMemory: tarsClient.chat.teachMemory,
};

export default chatApi;
