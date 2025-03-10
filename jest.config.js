const { readFileSync } = require('fs');
const path = require('path');

const migratedSuites = JSON.parse(
  readFileSync(path.resolve(__dirname, 'migrated-suites.json'), 'utf-8')
);

module.exports = {
  clearMocks: true,
  restoreMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: migratedSuites,
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/**/__tests__/**/*',
    '!packages/core/src/benchmark/**/*',
    '!packages/cli/src/index.ts',
    '!packages/cli/src/utils/assert-node-version.ts',
  ],
  // coverageThreshold: {
  //   'packages/core/': {
  //     statements: 84,
  //     branches: 72,
  //     functions: 76,
  //     lines: 85,
  //   },
  //   'packages/cli/': {
  //     statements: 67,
  //     branches: 54,
  //     functions: 68,
  //     lines: 68,
  //   },
  //   'packages/respect-core/': {
  //     statements: 83,
  //     branches: 72,
  //     functions: 82,
  //     lines: 84,
  //   },
  // },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
