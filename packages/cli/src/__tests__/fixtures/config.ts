export const ConfigFixture = {
  configFile: null,
  styleguide: {
    addIgnore: vi.fn(),
    skipRules: vi.fn(),
    skipPreprocessors: vi.fn(),
    saveIgnore: vi.fn(),
    skipDecorators: vi.fn(),
    ignore: null,
    decorators: {
      oas2: {},
      oas3_0: {},
      oas3_1: {},
    },
    preprocessors: {
      oas2: {},
      oas3_0: {},
      oas3_1: {},
    },
  },
};
