// Output formatting is tested in packages/cli/src/commands/recheck/__tests__/print.test.ts.
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { generateMarkdocSchema } from '../markdoc-schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(here, 'fixtures', name);

describe('generateMarkdocSchema', () => {
  const tmpDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function tmpOut(name = 'tags.yaml'): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'recheck-markdoc-schema-'));
    tmpDirs.push(dir);
    return path.join(dir, name);
  }

  it('writes a YAML file carrying the extracted statics under a generated-file header', async () => {
    const out = await tmpOut();
    const result = await generateMarkdocSchema({ from: [fixture('module-a.ts')], out });

    expect(result.status).toBe('written');
    if (result.status !== 'written') return;
    expect(result.outPath).toBe(out);
    const content = await readFile(out, 'utf8');
    expect(content).toContain('# Source module(s):');
    expect(content).toContain(fixture('module-a.ts'));
    expect(content).toContain('# Regenerate: redocly recheck --generate-markdoc-schema --from');

    const parsed = yaml.load(content) as Record<string, unknown>;
    expect(parsed['widget']).toEqual({
      selfClosing: true,
      attributes: {
        id: { type: 'string', required: true },
        variant: { type: 'string', enum: ['small', 'large'] },
      },
    });
    expect(parsed['onlyInA']).toBeDefined();
  });

  it('merges two modules whose shared tag is identical, tag appears once', async () => {
    const out = await tmpOut();
    const result = await generateMarkdocSchema({
      from: [fixture('module-a.ts'), fixture('module-b-same-widget.ts')],
      out,
    });

    expect(result.status).toBe('written');
    if (result.status !== 'written') return;
    const content = await readFile(out, 'utf8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    expect(Object.keys(parsed).filter((key) => key === 'widget')).toHaveLength(1);
    expect(parsed['onlyInA']).toBeDefined();
    expect(parsed['onlyInB']).toBeDefined();
  });

  it('rejects two modules whose shared tag differs, names the tag and both modules', async () => {
    const out = await tmpOut();
    const moduleA = fixture('module-a.ts');
    const moduleC = fixture('module-c-conflicting-widget.ts');
    const result = await generateMarkdocSchema({ from: [moduleA, moduleC], out });

    expect(result.status).toBe('conflicts');
    if (result.status !== 'conflicts') return;
    const conflictText = result.conflicts.join('\n');
    expect(conflictText).toContain('widget');
    expect(conflictText).toContain(moduleA);
    expect(conflictText).toContain(moduleC);
    expect(fs.existsSync(out)).toBe(false);
  });

  it('--check leaves an up-to-date file untouched', async () => {
    const out = await tmpOut();
    const writeResult = await generateMarkdocSchema({ from: [fixture('module-a.ts')], out });
    expect(writeResult.status).toBe('written');
    const mtimeBefore = (await stat(out)).mtimeMs;

    const checkResult = await generateMarkdocSchema({
      from: [fixture('module-a.ts')],
      out,
      check: true,
    });
    expect(checkResult).toEqual({ status: 'up-to-date', outPath: out });
    const mtimeAfter = (await stat(out)).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('--check reports a stale file after it was mutated', async () => {
    const out = await tmpOut();
    const writeResult = await generateMarkdocSchema({ from: [fixture('module-a.ts')], out });
    expect(writeResult.status).toBe('written');
    await writeFile(out, '# mutated by hand\nwidget: {}\n', 'utf8');

    const checkResult = await generateMarkdocSchema({
      from: [fixture('module-a.ts')],
      out,
      check: true,
    });
    expect(checkResult).toEqual({ status: 'stale', outPath: out });
  });

  it('--check against a file that never existed reports missing, not stale', async () => {
    const out = await tmpOut();
    const checkResult = await generateMarkdocSchema({
      from: [fixture('module-a.ts')],
      out,
      check: true,
    });
    expect(checkResult).toEqual({ status: 'missing', outPath: out });
  });

  it('a typo’d --out directory is a one-line diagnosis, not a stack trace', async () => {
    const out = path.join(tmpdir(), `rc-missing-dir-${Date.now()}`, 'sub', 'tags.yaml');
    const result = await generateMarkdocSchema({ from: [fixture('module-a.ts')], out });

    expect(result.status).toBe('write-error');
    if (result.status !== 'write-error') return;
    expect(result.outPath).toBe(out);
    expect(result.message).not.toContain('    at '); // no stack frames reach the user
  });
});
