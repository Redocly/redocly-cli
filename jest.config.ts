import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  clearMocks: true,
  restoreMocks: true,
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
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
      functions: 74,
      lines: 80,
    },
    'packages/cli/': {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
};

export default jestConfig;
