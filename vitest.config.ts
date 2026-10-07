import { configDefaults, defineConfig } from 'vitest/config';

const GENERATE_CLIENT = 'tests/e2e/generate-client';
const GENERATOR_TESTS = 'packages/client-generator/src/generators/__tests__';
const GO_FILES = [`${GENERATE_CLIENT}/{go,*.go}.test.ts`, `${GENERATOR_TESTS}/go.test.ts`];
const PHP_FILES = [`${GENERATE_CLIENT}/{php,*.php}.test.ts`, `${GENERATOR_TESTS}/php.test.ts`];
const PYTHON_FILES = [
  `${GENERATE_CLIENT}/{python,*.python}.test.ts`,
  `${GENERATOR_TESTS}/python.test.ts`,
];

function languageProject(language: string, files: string[]) {
  return {
    extends: true as const,
    test: {
      name: `client-generators-${language}`,
      include: files,
      globalSetup: [`${GENERATE_CLIENT}/setup/${language}.ts`],
      testTimeout: 120_000,
      hookTimeout: 120_000,
    },
  };
}

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    mockReset: true,
    environment: 'node',
    expect: { requireAssertions: true },
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
        'packages/*/src/**/__typecheck__/**',
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
          exclude: [
            ...configDefaults.exclude,
            `${GENERATOR_TESTS}/go.test.ts`,
            `${GENERATOR_TESTS}/php.test.ts`,
            `${GENERATOR_TESTS}/python.test.ts`,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          exclude: [...configDefaults.exclude, `${GENERATE_CLIENT}/**`],
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators',
          include: [`${GENERATE_CLIENT}/*.test.ts`],
          exclude: [...configDefaults.exclude, GO_FILES[0], PHP_FILES[0], PYTHON_FILES[0]],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      languageProject('go', GO_FILES),
      languageProject('php', PHP_FILES),
      languageProject('python', PYTHON_FILES),
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
