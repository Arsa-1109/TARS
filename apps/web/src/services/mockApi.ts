// apps/web/src/services/mockApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts
 */
import { tarsClient } from './tarsClient';

export class MockTarsApi {
  constructor() {
    return tarsClient as any;
  }
}

export default MockTarsApi;
