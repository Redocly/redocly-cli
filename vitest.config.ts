import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    mockReset: true,
    environment: 'node',
    expect: { requireAssertions: true },
    setupFiles: ['tests/silence-output.ts'],
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
          name: 'types',
          typecheck: {
            enabled: true,
            only: true,
            include: ['packages/*/src/**/*.test-d.ts'],
            // `npm run typecheck` checks the source files with the flags they need.
            ignoreSourceErrors: true,
          },
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
          include: ['packages/client-generator/tests/e2e/typescript/**/*.test.ts'],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-go',
          include: ['packages/client-generator/tests/e2e/go/**/*.test.ts'],
          globalSetup: ['packages/client-generator/tests/e2e/toolchains.ts'],
          provide: {
            requiredTools: [
              { name: 'Go', command: 'go', args: ['version'] },
              { name: 'gofmt', command: 'gofmt', args: ['-l'] },
            ],
          },
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-php',
          include: ['packages/client-generator/tests/e2e/php/**/*.test.ts'],
          globalSetup: ['packages/client-generator/tests/e2e/toolchains.ts'],
          provide: {
            requiredTools: [
              { name: 'PHP', command: 'php', args: ['--version'] },
              // The generated client sends requests with curl.
              {
                name: 'the PHP curl extension',
                command: 'php',
                args: ['-r', 'exit(extension_loaded("curl") ? 0 : 1);'],
              },
            ],
          },
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client-generators-python',
          include: ['packages/client-generator/tests/e2e/python/**/*.test.ts'],
          globalSetup: ['packages/client-generator/tests/e2e/toolchains.ts'],
          provide: {
            requiredTools: [
              { name: 'Python 3', command: 'python3', args: ['--version'] },
              {
                name: 'the httpx Python package',
                command: 'python3',
                args: ['-c', 'import httpx'],
              },
              {
                name: 'the pydantic Python package',
                command: 'python3',
                args: ['-c', 'import pydantic'],
              },
            ],
          },
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
