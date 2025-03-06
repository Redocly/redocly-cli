import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: [
      '__tests__/smoke/**/*',
      '__tests__/smoke-plugins/**/*',
      '__tests__/smoke-rebilly/**/*',
    ],
  },
});
