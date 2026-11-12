// apps/web/src/services/client.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts
 * Use tarsClient directly for partitioned namespaces and reactive cache invalidation.
 */
import { tarsClient } from './tarsClient';

export const api = tarsClient;
export const isMockMode = false;
export default api;
