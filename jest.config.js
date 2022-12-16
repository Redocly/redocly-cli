module.exports = {
  clearMocks: true,
  restoreMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
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
      lines: 79,
    },
    'packages/cli/': {
      statements: 51,
      branches: 40,
      functions: 47,
      lines: 52,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
