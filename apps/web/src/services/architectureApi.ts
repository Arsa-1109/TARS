// apps/web/src/services/architectureApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.cortex)
 */
import { tarsClient } from './tarsClient';

export type { StagedBreachDetail, StagedRadarCheckResponse } from './tarsClient';

export const architectureApi = tarsClient.cortex;
export default architectureApi;
