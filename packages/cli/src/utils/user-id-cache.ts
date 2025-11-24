import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { USER_ID_CACHE_FILE } from './constants.js';

const isCI = !!process.env.CI;

export const cacheUserId = (userId: string): void => {
  if (isCI || !userId) {
    return;
  }

  try {
    const userIdFile = join(tmpdir(), USER_ID_CACHE_FILE);
    writeFileSync(userIdFile, userId);
  } catch (e) {
    // Silently fail - telemetry should not break the CLI
  }
};

export const getCachedUserId = (): string | undefined => {
  if (isCI) {
    return;
  }

  try {
    const userIdFile = join(tmpdir(), USER_ID_CACHE_FILE);

    if (!existsSync(userIdFile)) {
      return;
    }

    return readFileSync(userIdFile).toString().trim();
  } catch (e) {
    return;
  }
};
