export const __redoclyClient = {
  isAuthorizedWithRedocly: jest.fn().mockResolvedValue(true),
  isAuthorizedWithRedoclyByRegion: jest.fn().mockResolvedValue(true),
  login: jest.fn(),
  registryApi: {
    setAccessTokens: jest.fn(),
    authStatus: jest.fn(),
    prepareFileUpload: jest.fn().mockResolvedValue({
      signedUploadUrl: 'signedUploadUrl',
      filePath: 'filePath',
    }),
    pushApi: jest.fn(),
  },
};

export const RedoclyClient = jest.fn(() => __redoclyClient);
export const loadConfig = jest.fn(() => ({
  configFile: null,
  lint: { skipRules: jest.fn(), skipPreprocessors: jest.fn(), skipDecorators: jest.fn() },
}));
export const mergeLintConfigs = jest.fn();
export const lint = jest.fn();
export const bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = jest.fn(() => ({ errors: 0 }));
export const formatProblems = jest.fn();
export const slash = jest.fn();
