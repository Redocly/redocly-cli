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

  it('takes medians over scored files only; a file with no prose is listed but unscored', async () => {
    await fs.writeFile(path.join(tempDir, 'a.md'), '# A\n\nThe cat sat on the mat. It was warm.\n');
    await fs.writeFile(
      path.join(tempDir, 'b.md'),
      '# B\n\nThis endpoint returns a list of users. Each user carries an identifier.\n'
    );
    await fs.writeFile(path.join(tempDir, 'code-only.md'), '```js\nconst a = 1;\n```\n');

    const result = await runReadability(tempDir, await resolveConfig(tempDir), {});

    const byName = new Map(result.rows.map((row) => [path.basename(row.file), row]));
    expect(result.rows.map((row) => path.basename(row.file))).toEqual([
      'a.md',
      'b.md',
      'code-only.md',
    ]);
    expect(byName.get('code-only.md')?.fleschReadingEase).toBeNull();
    expect(result.summary.files).toBe(3);
    expect(result.summary.scored).toBe(2);

    // Two scored files: the median is their mean, rounded to two decimals.
    const [a, b] = [byName.get('a.md'), byName.get('b.md')];
    expect(result.summary.medianFleschReadingEase).toBe(
      Math.round((((a?.fleschReadingEase ?? NaN) + (b?.fleschReadingEase ?? NaN)) / 2) * 100) / 100
    );
  });

  it('reports null medians when no file has prose to score', async () => {
    await fs.writeFile(path.join(tempDir, 'code-only.md'), '```js\nconst a = 1;\n```\n');

    const result = await runReadability(tempDir, await resolveConfig(tempDir), {});

    expect(result.summary).toEqual({
      files: 1,
      scored: 0,
      medianFleschReadingEase: null,
      medianFleschKincaidGrade: null,
      medianAutomatedReadabilityIndex: null,
    });
  });

  it('with changedOnly, scores only the files named in the changed list', async () => {
    const kept = path.join(tempDir, 'kept.md');
    await fs.writeFile(kept, '# Kept\n\nThe cat sat on the mat.\n');
    await fs.writeFile(path.join(tempDir, 'other.md'), '# Other\n\nThe dog ran home.\n');
    const changedListPath = path.join(tempDir, 'changed.txt');
    await fs.writeFile(changedListPath, `${kept}\n`);

    const result = await runReadability(tempDir, await resolveConfig(tempDir), {
      changedOnly: true,
      changedListPath,
    });

    expect(result.filesFound).toBe(1);
    expect(result.rows.map((row) => row.file)).toEqual([kept]);
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
