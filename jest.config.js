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
      functions: 65,
      lines: 77,
    },
    'packages/cli/': {
      statements: 90,
      branches: 27,
      functions: 29,
      lines: 32,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
