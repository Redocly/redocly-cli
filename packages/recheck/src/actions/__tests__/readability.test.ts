// Output formatting is tested in packages/cli/src/commands/recheck/__tests__/print.test.ts.
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
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

  it('returns rows and medians as data', async () => {
    await fs.writeFile(path.join(tempDir, 'a.md'), '# A\n\nThe cat sat on the mat. It was warm.\n');
    const result = await runReadability(tempDir, await resolveConfig(tempDir), {});
    expect(result.filesFound).toBe(1);
    expect(result.rows.map((row) => path.basename(row.file))).toEqual(['a.md']);
    expect(result.summary.scored).toBe(1);
    expect(result.unreadableFiles).toEqual([]);
  });

  it('scores two roots into one set of rows', async () => {
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

    const result = await runReadability([guides, reference], await resolveConfig(tempDir), {});

    expect(result.roots).toEqual([guides, reference]);
    expect(result.filesFound).toBe(2);
    expect(result.rows.map((row) => path.basename(row.file))).toEqual(['guide.md', 'api.md']);
    expect(result.summary.files).toBe(2);
    expect(result.summary.scored).toBe(2);
    expect(result.summary.medianFleschReadingEase).not.toBeNull();
  });

  // chmod 000 does not stop root (or Windows) from reading the file.
  it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
    'lists an unreadable file and scores the rest',
    async () => {
      await fs.writeFile(path.join(tempDir, 'ok.md'), '# Ok\n\nThe cat sat on the mat.\n');
      const unreadablePath = path.join(tempDir, 'unreadable.md');
      await fs.writeFile(unreadablePath, '# Secret\n\nThe dog ran home.\n');
      await fs.chmod(unreadablePath, 0o000);

      const result = await runReadability(tempDir, await resolveConfig(tempDir), {});

      expect(result.filesFound).toBe(2);
      expect(result.unreadableFiles).toEqual([unreadablePath]);
      expect(result.rows.map((row) => path.basename(row.file))).toEqual(['ok.md']);
      expect(result.summary.files).toBe(1);
    }
  );
});
