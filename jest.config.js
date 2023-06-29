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
      statements: 80,
      branches: 71,
      functions: 69,
      lines: 80,
    },
    'packages/cli/': {
      statements: 55,
      branches: 46,
      functions: 55,
      lines: 55,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
