export const __redoclyClient = {
  isAuthorizedWithRedocly: jest.fn(() => true),
  login: jest.fn(),
  getOrganizationId: jest.fn(() => ({ organizationById: 'organizationById' })),
  getDefinitionVersion: jest.fn(() => ({ version: null })),
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
  lint: {
    skipRules: jest.fn(),
    skipPreprocessors: jest.fn(),
    skipDecorators: jest.fn(),
    extendTypes: jest.fn(),
  },
}));
export const lint = jest.fn();
export const bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = jest.fn(() => ({ errors: 0 }));
export const formatProblems = jest.fn();

export const __baseResolver = {
  resolveDocument: jest.fn(() => Promise.resolve({
    source: {
      absoluteRef: ''
    },
    parsed: '',
  }
  ))
};
export const BaseResolver = jest.fn(() => __baseResolver);

export const detectOpenAPI = jest.fn(() => 'version');
export const openAPIMajor = jest.fn(() => 'oas3');
export enum OasMajorVersion {
  Version2 = 'oas2',
  Version3 = 'oas3',
}
export const normalizeTypes = jest.fn(() => ({ DefinitionRoot: '' }));
export const resolveDocument = jest.fn();
export const Stats = jest.fn();
export const normalizeVisitors = jest.fn();
export const walkDocument = jest.fn();
export const bundleDocument = jest.fn(() => Promise.resolve({}));
