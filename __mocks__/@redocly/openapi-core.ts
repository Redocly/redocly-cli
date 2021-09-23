export const __redoclyClient = {
  isAuthorizedWithRedocly: jest.fn(() => true),
  login: jest.fn(),
  getOrganizationId: jest.fn(() => ({ organizationById: 'organizationById' })),
  getDefinitionVersion: jest.fn(),
  getSignedUrl: jest.fn(() => ({
    signFileUploadCLI: { signedFileUrl: null, uploadedFilePath: null },
  })),
  getDefinitionByName: jest.fn(() => ({ definition: 'definition' })),
  createDefinitionVersion: jest.fn(),
  updateDefinitionVersion: jest.fn(),
};

export const RedoclyClient = jest.fn(() => __redoclyClient);
export const loadConfig = jest.fn(() => ({
  configFile: null,
  lint: { skipRules: jest.fn(), skipPreprocessors: jest.fn(), skipDecorators: jest.fn() },
  apiDefinitions: []
}));
export const lint = jest.fn();
export const bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = jest.fn(() => ({ errors: 0 }));
export const formatProblems = jest.fn();
export const BaseResolver = jest.fn(() => ({
  resolveDocument: jest.fn(() => {
    return {
      source: {
        absoluteRef: null
      },
      config: {
        "http": {
          "headers":[]
        },
        "apiDefinitions": [],
        "cache": {}
      }
    }
  })
}));

export const bundleDocument = jest.fn(() => Promise.resolve(bundle));
