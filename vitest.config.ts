import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

const configExtension: { [key: string]: ViteUserConfig } = {
  unit: defineConfig({
    test: {
      include: ['packages/*/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        reporter: ['text', 'json-summary', 'json'],
        reportOnFailure: true,
        include: [
          'packages/cli/src/**/*.ts',
          'packages/core/src/**/*.ts',
          'packages/respect-core/src/**/*.ts',
          'packages/client-generator/src/**/*.ts',
          'packages/recheck/src/**/*.ts',
        ],
        provider: 'istanbul',
        exclude: [
          'packages/**/__tests__/**/*',
          'packages/cli/src/index.ts',
          'packages/cli/src/utils/assert-node-version.ts',
        ],
        thresholds: {
          lines: 77,
          functions: 81,
          statements: 77,
          branches: 71,
        },
      },
    },
  }),
  e2e: defineConfig({
    test: {
      include: ['tests/e2e/**/*.test.ts'],
      // Client generation has its own suite and its own CI job (see `generators` below):
      // its bars compile real Python/Go/PHP/TypeScript output, so a growing set of them
      // must not slow the job everything else shares.
      exclude: ['tests/e2e/generate-client/**'],
    },
  }),
  // Everything about client generation in one command: the package's unit tests plus the
  // end-to-end bars. The unit tests also run under `unit`, which keeps the coverage report
  // whole — they are seconds, and being able to run the whole generator surface at once is
  // worth that.
  'client-generators': defineConfig({
    test: {
      include: [
        'packages/client-generator/src/**/*.test.ts',
        'tests/e2e/generate-client/**/*.test.ts',
      ],
    },
  }),
  'smoke-rebilly': defineConfig({
    test: {
      include: ['tests/smoke/rebilly/**/*.smoke.ts'],
    },
  }),
  default: defineConfig({}),
};

export default mergeConfig(
  defineConfig({
    // Generator-folder sources import their own package by name (the same specifier an
    // ejected copy uses); resolve those to src so tests exercise the working tree, not lib.
    resolve: {
      alias: [
        {
          find: /^@redocly\/client-generator\/printers\/([a-z]+)$/,
          replacement: `${import.meta.dirname}/packages/client-generator/src/printers/$1.ts`,
        },
        {
          find: /^@redocly\/client-generator\/contracts\/([a-z]+)$/,
          replacement: `${import.meta.dirname}/packages/client-generator/src/contracts/$1.ts`,
        },
        {
          find: '@redocly/client-generator/runtime-sources',
          replacement: `${import.meta.dirname}/packages/client-generator/src/runtime-sources.ts`,
        },
        {
          find: /^@redocly\/client-generator$/,
          replacement: `${import.meta.dirname}/packages/client-generator/src/index.ts`,
        },
      ],
    },
    test: {
      globals: true,
      restoreMocks: true,
      mockReset: true,
      environment: 'node',
      env: {
        FORCE_COLOR: '1',
        REDOCLY_TELEMETRY: 'off',
      },
    },
  }),
  configExtension[process.env.VITEST_SUITE || 'default']
);
