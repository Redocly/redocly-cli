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
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    }
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
