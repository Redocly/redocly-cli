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

  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
