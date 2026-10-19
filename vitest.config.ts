import { defineConfig } from 'vitest/config';

const CLIENT_GENERATOR_TESTS = 'packages/client-generator/tests';
const GENERATOR_WARNINGS_SETUP = `${CLIENT_GENERATOR_TESTS}/helpers/silence-generator-warnings.ts`;

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    mockReset: true,
    environment: 'node',
    env: {
      FORCE_COLOR: '1',
      REDOCLY_TELEMETRY: 'off',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/**/__tests__/**/*',
        'packages/cli/src/index.ts',
        'packages/cli/src/utils/assert-node-version.ts',
        'packages/client-generator/src/generators/{go,php,python}/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators',
          include: [`${CLIENT_GENERATOR_TESTS}/typescript/**/*.test.ts`],
          setupFiles: [GENERATOR_WARNINGS_SETUP],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-go',
          include: [`${CLIENT_GENERATOR_TESTS}/go/**/*.test.ts`],
          globalSetup: [`${CLIENT_GENERATOR_TESTS}/helpers/setup-go.ts`],
          setupFiles: [GENERATOR_WARNINGS_SETUP],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-php',
          include: [`${CLIENT_GENERATOR_TESTS}/php/**/*.test.ts`],
          globalSetup: [`${CLIENT_GENERATOR_TESTS}/helpers/setup-php.ts`],
          setupFiles: [GENERATOR_WARNINGS_SETUP],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-python',
          include: [`${CLIENT_GENERATOR_TESTS}/python/**/*.test.ts`],
          globalSetup: [`${CLIENT_GENERATOR_TESTS}/helpers/setup-python.ts`],
          setupFiles: [GENERATOR_WARNINGS_SETUP],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'smoke-rebilly',
          include: ['tests/smoke/rebilly/**/*.smoke.ts'],
        },
      },
    ],
  },
});
