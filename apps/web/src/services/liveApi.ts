// apps/web/src/services/liveApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts
 */
import { tarsClient } from './tarsClient';

export class LiveTarsApi {
  constructor() {
    return tarsClient as any;
  }
}

export default LiveTarsApi;
