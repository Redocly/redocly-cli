// Output formatting is tested in packages/cli/src/commands/recheck/__tests__/print.test.ts.
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_BASELINE_FILE,
  resolveRecheckConfig,
  type ResolvedRecheckConfig,
} from '../../config/resolve.js';
import { baselineKeyMapper, parseBaseline } from '../../core/baseline.js';
import type { Problem } from '../../types/index.js';
import { generateBaseline } from '../baseline.js';
import type { EmbeddedInput } from '../embedded.js';
import { runLint } from '../lint.js';

// A prose line longer than the `recheck/line-length` limit of 80 characters.
const LONG_LINE = 'word '.repeat(30).trim();

// One embedded `info.description` whose only line is longer than the limit.
function descriptionInput(apiFile: string): EmbeddedInput {
  return {
    file: apiFile,
    pointer: '#/info/description',
    content: `${LONG_LINE}\n`,
    mapPosition: (line, column) => ({ line, column }),
  };
}

async function resolveConfig(
  configDir: string,
  block: Record<string, unknown> = {},
  extendsList?: string[]
): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({ extends: extendsList, block, configDir });
  if (!result.success) {
    throw new Error(
      `config resolution failed: ${result.errors.map((error) => error.message).join('; ')}`
    );
  }
  return result.config;
}

async function readWrittenBaseline(outPath: string) {
  return parseBaseline(await fs.readFile(outPath, 'utf8'), outPath);
}

describe('generateBaseline', () => {
  const tempDirs: string[] = [];

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-baseline-result-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('returns the written path and the counts', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), `# Page\n\n${LONG_LINE}\n`);
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await generateBaseline(dir, config);
    expect(result.outPath).toBe(path.join(dir, DEFAULT_BASELINE_FILE));
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.baselinedFileCount).toBe(1);
    expect(result.unreadableFiles).toEqual([]);
  });

  it('writes one error count per file and rule, keyed from the config directory', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), `# Page\n\n${LONG_LINE}\n\n${LONG_LINE}\n`);
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await generateBaseline(dir, config);

    expect(result.roots).toEqual([dir]);
    expect(result.filesFound).toBe(1);
    const written = await readWrittenBaseline(result.outPath);
    expect(written.files['page.md']['recheck/line-length']).toBe(2);
    const writtenTotal = Object.values(written.files['page.md']).reduce(
      (sum, count) => sum + count,
      0
    );
    expect(writtenTotal).toBe(result.errorCount);
  });

  it('counts errors only and baselines no file that has only warnings', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), '# Page\nThis has trailing spaces   \n');
    const config = await resolveConfig(dir, {
      rules: {
        'recheck/no-trailing-spaces': {
          severity: 'warn',
          message: 'No trailing spaces',
          assertions: { 'no-trailing-spaces': {} },
        },
      },
    });
    const result = await generateBaseline(dir, config);

    expect(result.filesFound).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.baselinedFileCount).toBe(0);
    expect((await readWrittenBaseline(result.outPath)).files).toEqual({});
  });

  it('baselines the files of every root', async () => {
    const dir = await makeTempDir();
    const guides = path.join(dir, 'guides');
    const reference = path.join(dir, 'reference');
    await fs.mkdir(guides);
    await fs.mkdir(reference);
    await fs.writeFile(path.join(guides, 'guide.md'), `# Guide\n\n${LONG_LINE}\n`);
    await fs.writeFile(path.join(reference, 'api.md'), `# API\n\n${LONG_LINE}\n`);
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await generateBaseline([guides, reference], config);

    expect(result.roots).toEqual([guides, reference]);
    expect(result.filesFound).toBe(2);
    expect(result.baselinedFileCount).toBe(2);
    expect(Object.keys((await readWrittenBaseline(result.outPath)).files)).toEqual([
      'guides/guide.md',
      'reference/api.md',
    ]);
  });

  // chmod 000 does not stop root (or Windows) from reading the file.
  it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
    'lists an unreadable file and baselines the rest',
    async () => {
      const dir = await makeTempDir();
      await fs.writeFile(path.join(dir, 'page.md'), `# Page\n\n${LONG_LINE}\n`);
      const unreadablePath = path.join(dir, 'unreadable.md');
      await fs.writeFile(unreadablePath, `# Secret\n\n${LONG_LINE}\n`);
      await fs.chmod(unreadablePath, 0o000);
      const config = await resolveConfig(dir, {}, ['recheck/markdown']);
      const result = await generateBaseline(dir, config);

      expect(result.filesFound).toBe(2);
      expect(result.unreadableFiles).toEqual([unreadablePath]);
      expect(result.baselinedFileCount).toBe(1);
      expect(Object.keys((await readWrittenBaseline(result.outPath)).files)).toEqual(['page.md']);
    }
  );

  it('includes embedded API description findings, keyed by the API file', async () => {
    const dir = await makeTempDir();
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const apiFile = path.join(dir, 'openapi.yaml');
    const result = await generateBaseline([], config, {
      embeddedInputs: [descriptionInput(apiFile)],
    });

    expect(result.roots).toEqual([]);
    expect(result.filesFound).toBe(0);
    expect(result.apiDescriptionCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.baselinedFileCount).toBe(1);
    const written = await readWrittenBaseline(result.outPath);
    expect(written.files[baselineKeyMapper(dir)(apiFile)]).toEqual({ 'recheck/line-length': 1 });
  });

  it('leaves out findings the ignore predicate accepts, so no run reports them stale', async () => {
    const dir = await makeTempDir();
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const apiFile = path.join(dir, 'openapi.yaml');
    const embeddedInputs = [descriptionInput(apiFile)];
    const isIgnored = (problem: Problem) => problem.pointer === '#/info/description';
    const baselineRun = await generateBaseline([], config, { embeddedInputs, isIgnored });

    expect(baselineRun.apiDescriptionCount).toBe(1);
    expect(baselineRun.errorCount).toBe(0);
    expect(baselineRun.baselinedFileCount).toBe(0);
    const written = await readWrittenBaseline(baselineRun.outPath);
    expect(written.files[baselineKeyMapper(dir)(apiFile)]).toBeUndefined();

    // The baseline is discovered by presence, so the config resolves again
    // now that the file exists.
    const configWithBaseline = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await runLint([], configWithBaseline, { embeddedInputs, isIgnored });
    expect(result.status).toBe('completed');
    if (result.status !== 'completed') return;
    expect(result.baseline).toEqual({ matched: 0, new: 0, stale: 0 });
    expect(result.problems.filter((problem) => problem.severity === 'error')).toHaveLength(0);
  });
});
