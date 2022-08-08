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
      statements: 79,
      branches: 71,
      functions: 68,
      lines: 78,
    },
    'packages/cli/': {
      statements: 37,
      branches: 31,
      functions: 32,
      lines: 38,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
