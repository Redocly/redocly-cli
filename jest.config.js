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
    '!packages/cli/src/utils/assert-node-version.ts',
  ],
  coverageThreshold: {
    'packages/core/': {
      statements: 80,
      branches: 72,
      functions: 76,
      lines: 80,
    },
    'packages/cli/': {
      statements: 64,
      branches: 51,
      functions: 63,
      lines: 64,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
