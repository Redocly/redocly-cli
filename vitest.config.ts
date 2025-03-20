import { defineConfig, mergeConfig } from 'vitest/config';

import type { ViteUserConfig } from 'vitest/config';

const configExtension: { [key: string]: ViteUserConfig } = {
  unit: defineConfig({
    test: {
      include: ['packages/*/src/**/*.test.ts'],
    },
  }),
  e2e: defineConfig({
    test: {
      include: ['__tests__/commands.test.ts'],
    },
  }),
  'smoke-rebilly': defineConfig({
    test: {
      include: ['__tests__/smoke-rebilly/**/*.smoke.ts'],
    },
  }),
  'coverage-cli': defineConfig({
    test: {
      include: ['packages/cli/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        include: ['packages/cli/src/**/*.ts'],
      },
    },
  }),
  'coverage-core': defineConfig({
    test: {
      include: ['packages/core/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        include: ['packages/core/src/**/*.ts'],
      },
    },
  }),
  'coverage-respect-core': defineConfig({
    test: {
      include: ['packages/respect-core/src/**/*.test.ts'],
      coverage: {
        enabled: true,
        include: ['packages/respect-core/src/**/*.ts'],
      },
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
      coverage: {
        provider: 'istanbul',
        exclude: [
          'packages/**/__tests__/**/*',
          'packages/core/src/benchmark/**/*',
          'packages/cli/src/index.ts',
          'packages/cli/src/utils/assert-node-version.ts',
        ],
      },
    },
  }),
  configExtension[process.env.VITEST_SUITE || 'default']
);
