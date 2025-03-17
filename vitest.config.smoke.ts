import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    environment: 'node',
    include: ['__tests__/smoke-rebilly/**/*.smoke.ts'],
    env: {
      FORCE_COLOR: '1',
      REDOCLY_TELEMETRY: 'off',
    },
  },
});
