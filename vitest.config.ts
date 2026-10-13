import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

const configExtension: { [key: string]: ViteUserConfig } = {
  unit: defineConfig({
    test: {
      include: ['packages/*/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        reporter: ['text', 'json-summary', 'json'],
        reportOnFailure: true,
        include: ['packages/*/src/**/*.ts'],
        provider: 'istanbul',
        exclude: [
          'packages/**/__tests__/**/*',
          'packages/cli/src/index.ts',
          'packages/cli/src/utils/assert-node-version.ts',
          'packages/recheck/src/**/__typecheck__/**',
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 75,
        },
      },
    },
  }),
  e2e: defineConfig({
    test: {
      include: ['tests/e2e/**/*.test.ts'],
      // Client generation has its own suite and its own CI job (see `client-generators` below):
      // its bars compile real Python/Go/PHP/TypeScript output, so a growing set of them
      // must not slow the job everything else shares.
      exclude: ['tests/e2e/generate-client/**'],
    },
  }),
  'client-generators': defineConfig({
    test: {
      include: ['tests/e2e/generate-client/**/*.test.ts'],
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
