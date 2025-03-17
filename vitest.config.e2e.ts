import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    environment: 'node',
    include: ['__tests__/respect/**/*.test.ts', '__tests__/commands.test.ts'],
    env: {
      FORCE_COLOR: '1',
    },
  },
});
