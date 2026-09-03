import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
import { collectingLogger } from '../logger.js';
import { runReadability } from '../readability.js';

async function resolveConfig(configDir: string): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({ block: {}, configDir });
  if (!result.success) {
    throw new Error(
      `config resolution failed: ${result.errors.map((error) => error.message).join('; ')}`
    );
  }
  return result.config;
}

describe('runReadability', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-readability-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('scores two roots into one table', async () => {
    const guides = path.join(tempDir, 'guides');
    const reference = path.join(tempDir, 'reference');
    await fs.mkdir(guides);
    await fs.mkdir(reference);
    await fs.writeFile(
      path.join(guides, 'guide.md'),
      '# Guide\n\nThe cat sat on the mat. The dog ran home.\n'
    );
    await fs.writeFile(
      path.join(reference, 'api.md'),
      '# API\n\nThis endpoint returns a list of users. Each user carries an identifier.\n'
    );

    const logger = collectingLogger();
    const exitCode = await runReadability(
      [guides, reference],
      await resolveConfig(tempDir),
      {},
      logger
    );

    expect(exitCode).toBe(0);
    expect(logger.lines.some((line) => line.includes('Scoring 2 markdown file(s)'))).toBe(true);
    // One table, not one per root: a single header line with both files under it.
    expect(logger.lines.filter((line) => line.includes('FRE     Grade'))).toHaveLength(1);
    const table = logger.lines.join('\n');
    expect(table).toContain('guide.md');
    expect(table).toContain('api.md');
  });
});
