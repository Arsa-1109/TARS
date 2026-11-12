// apps/web/src/services/decisionsApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.decisions)
 */
import { tarsClient } from './tarsClient';

export const decisionsApi = tarsClient.decisions;

export class DecisionsApi {
  constructor() {
    return tarsClient.decisions as any;
  }
}

export default decisionsApi;
