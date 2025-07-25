import { defineConfig, mergeConfig } from 'vitest/config';

import type { ViteUserConfig } from 'vitest/config';

const configExtension: { [key: string]: ViteUserConfig } = {
  unit: defineConfig({
    test: {
      include: ['packages/*/src/**/*.test.ts'],
      coverage: {
        enabled: true,
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
          lines: 78,
          functions: 80,
          statements: 78,
          branches: 69,
        },
      },
    },
  }),
  e2e: defineConfig({
    test: {
      include: ['tests/e2e/__tests__/*.test.ts'],
    },
  }),
  'smoke-rebilly': defineConfig({
    test: {
      include: ['tests/smoke-rebilly/**/*.smoke.ts'],
    },
  }),
  default: defineConfig({}),
};

export default mergeConfig(
  defineConfig({
    test: {
      globals: true,
      restoreMocks: true,
      environment: 'node',
      env: {
        FORCE_COLOR: '1',
        REDOCLY_TELEMETRY: 'off',
      },
    },
  }),
  configExtension[process.env.VITEST_SUITE || 'default']
);
