// apps/web/src/services/ingestionApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.ingestion)
 */
import { tarsClient } from './tarsClient';

export type { IngestedDocument, CallDeleteResponse } from './tarsClient';

export const ingestionApi = tarsClient.ingestion;
export default ingestionApi;
