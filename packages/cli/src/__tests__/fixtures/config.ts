import { type StyleguideConfig, type Config } from '@redocly/openapi-core';

export const configFixture: Config = {
  resolve: {
    http: {
      headers: [],
    },
  },
  _rawConfig: {},
  resolvedConfig: {
    apis: {},
  },
  configPath: undefined,
  governance: {
    apis: {},
    root: {
      addIgnore: vi.fn(),
      skipRules: vi.fn(),
      skipPreprocessors: vi.fn(),
      saveIgnore: vi.fn(),
      skipDecorators: vi.fn(),
      ignore: {},
      decorators: {
        oas2: {},
        oas3_0: {},
        oas3_1: {},
        async2: {},
        async3: {},
        arazzo1: {},
        overlay1: {},
      },
      preprocessors: {
        oas2: {},
        oas3_0: {},
        oas3_1: {},
        async2: {},
        async3: {},
        arazzo1: {},
        overlay1: {},
      },
      plugins: [],
      doNotResolveExamples: false,
      rules: {
        oas2: {},
        oas3_0: {},
        oas3_1: {},
        async2: {},
        async3: {},
        arazzo1: {},
        overlay1: {},
      },
      resolveIgnore: vi.fn(),
      addProblemToIgnore: vi.fn(),
      extendTypes: vi.fn(),
      getRuleSettings: vi.fn(),
      getPreprocessorSettings: vi.fn(),
      getDecoratorSettings: vi.fn(),
      getUnusedRules: vi.fn(),
      getRulesForSpecVersion: vi.fn(),
      extendPaths: [],
      pluginPaths: [],
    } as Omit<StyleguideConfig, '_usedRules' | '_usedVersions'> as StyleguideConfig,
  },
};
