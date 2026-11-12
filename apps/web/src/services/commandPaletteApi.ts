// apps/web/src/services/commandPaletteApi.ts
/**
 * @deprecated Consolidated into apps/web/src/services/tarsClient.ts (tarsClient.searchFederated)
 */
import { tarsClient, SearchResultGroup } from './tarsClient';

export type { SearchCategory, SearchResultItem, SearchResultGroup } from './tarsClient';

export const commandPaletteApi = {
  searchFederated: (query: string): Promise<SearchResultGroup[]> => tarsClient.searchFederated(query),
};

export class CommandPaletteApiService {
  searchFederated(query: string): Promise<SearchResultGroup[]> {
    return tarsClient.searchFederated(query);
  }
}

export default commandPaletteApi;
