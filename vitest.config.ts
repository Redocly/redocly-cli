import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import * as path from 'node:path';

const migratedSuites = JSON.parse(
  readFileSync(path.resolve(__dirname, 'migrated-suites.json'), 'utf-8')
);

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    environment: 'node',
    include: migratedSuites,
    env: {
      FORCE_COLOR: '1',
      REDOCLY_TELEMETRY: 'off',
    },
  },
});
