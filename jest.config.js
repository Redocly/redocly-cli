module.exports = {
  clearMocks: true,
  restoreMocks: true,
  preset: 'ts-jest',
  verbose: true,
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
      branches: 70,
      functions: 73,
      lines: 80,
    },
    'packages/cli/': {
      statements: 60,
      branches: 49,
      functions: 60,
      lines: 60,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
