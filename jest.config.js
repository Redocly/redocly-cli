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
      statements: 84,
      branches: 72,
      functions: 76,
      lines: 84,
    },
    'packages/cli/': {
      statements: 63,
      branches: 51,
      functions: 62,
      lines: 63,
    },
    'packages/respect-core/': {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
