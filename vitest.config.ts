import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/**/__tests__/**/*',
        'packages/core/src/benchmark/**/*',
        'packages/cli/src/index.ts',
        'packages/cli/src/utils/assert-node-version.ts',
      ],
      thresholds: {
        'packages/core/': {
          statements: 84,
          branches: 72,
          functions: 76,
          lines: 84,
        },
        'packages/cli/': {
          statements: 63,
          branches: 51,
          functions: 62,
          lines: 63,
        },
        'packages/respect-core/': {
          statements: 79,
          branches: 68,
          functions: 75,
          lines: 79,
        },
      },
    },
    include: ['**/*.test.ts'],
  },
});
