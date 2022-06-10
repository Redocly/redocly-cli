module.exports = {
  clearMocks: true,
  restoreMocks: true,
  preset: 'ts-jest',
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/**/__tests__/**/*',
    '!packages/core/src/benchmark/**/*',
    '!packages/cli/src/index.ts',
    '!packages/cli/src/assert-node-version.ts',
  ],
  coverageThreshold: {
    'packages/core/': {
      statements: 77,
      branches: 69,
      functions: 66,
      lines: 77,
    },
    'packages/cli/': {
      statements: 37,
      branches: 30,
      functions: 32,
      lines: 39,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
