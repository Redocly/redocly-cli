export const ConfigFixture = {
  configFile: null,
  lint: {
    addIgnore: jest.fn(),
    skipRules: jest.fn(),
    skipPreprocessors: jest.fn(),
    saveIgnore: jest.fn(),
    skipDecorators: jest.fn(),
    ignore: null,
  },
};
