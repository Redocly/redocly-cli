import { defineConfig, mergeConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

const configExtension: { [key: string]: ViteUserConfig } = {
  unit: defineConfig({
    test: {
      clearMocks: true,
      mockReset: true,
      include: ['packages/*/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        reporter: ['text', 'json-summary', 'json'],
        reportOnFailure: true,
        include: [
          'packages/cli/src/**/*.ts',
          'packages/core/src/**/*.ts',
          'packages/respect-core/src/**/*.ts',
        ],
        provider: 'istanbul',
        exclude: [
          'packages/**/__tests__/**/*',
          'packages/cli/src/index.ts',
          'packages/cli/src/utils/assert-node-version.ts',
        ],
        thresholds: {
          lines: 79,
          functions: 83,
          statements: 78,
          branches: 71,
        },
      },
    },
  }),
  e2e: defineConfig({
    test: {
      include: ['tests/e2e/**/*.test.ts'],
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
