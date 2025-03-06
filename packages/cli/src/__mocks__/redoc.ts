export const loadAndBundleSpec = vi.fn(() => Promise.resolve({ openapi: '3.0.0' }));
export const createStore = vi.fn(() => Promise.resolve({ toJS: vi.fn(() => '{}') }));
