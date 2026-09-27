import { TarsApi } from './api';
import { MockTarsApi } from './mockApi';
import { LiveTarsApi } from './liveApi';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export const api: TarsApi = useMock ? new MockTarsApi() : new LiveTarsApi();

export const isMockMode = useMock;
