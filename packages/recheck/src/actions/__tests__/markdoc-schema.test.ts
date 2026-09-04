import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { collectingLogger } from '../logger.js';
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
    const logger = collectingLogger();
    const result = await generateMarkdocSchema({ from: [fixture('module-a.ts')], out }, logger);

    expect(result, `errors:\n${logger.errors.join('\n')}`).toBe(0);
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

  it('merges two modules whose shared tag is identical, exit 0, tag appears once', async () => {
    const out = await tmpOut();
    const logger = collectingLogger();
    const result = await generateMarkdocSchema(
      { from: [fixture('module-a.ts'), fixture('module-b-same-widget.ts')], out },
      logger
    );

    expect(result, `errors:\n${logger.errors.join('\n')}`).toBe(0);
    const content = await readFile(out, 'utf8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    expect(Object.keys(parsed).filter((key) => key === 'widget')).toHaveLength(1);
    expect(parsed['onlyInA']).toBeDefined();
    expect(parsed['onlyInB']).toBeDefined();
  });

  it('rejects two modules whose shared tag differs, exit 1, names the tag and both modules', async () => {
    const out = await tmpOut();
    const moduleA = fixture('module-a.ts');
    const moduleC = fixture('module-c-conflicting-widget.ts');
    const logger = collectingLogger();
    const result = await generateMarkdocSchema({ from: [moduleA, moduleC], out }, logger);

    expect(result).toBe(1);
    const errorText = logger.errors.join('\n');
    expect(errorText).toContain('widget');
    expect(errorText).toContain(moduleA);
    expect(errorText).toContain(moduleC);
    expect(fs.existsSync(out)).toBe(false);
  });

  it('--check exits 0 and leaves an up-to-date file untouched', async () => {
    const out = await tmpOut();
    const writeResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out },
      collectingLogger()
    );
    expect(writeResult).toBe(0);
    const mtimeBefore = (await stat(out)).mtimeMs;

    const logger = collectingLogger();
    const checkResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out, check: true },
      logger
    );
    expect(checkResult, `errors:\n${logger.errors.join('\n')}`).toBe(0);
    const mtimeAfter = (await stat(out)).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('--check exits 1 and names the file after it was mutated', async () => {
    const out = await tmpOut();
    const writeResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out },
      collectingLogger()
    );
    expect(writeResult).toBe(0);
    await writeFile(out, '# mutated by hand\nwidget: {}\n', 'utf8');

    const logger = collectingLogger();
    const checkResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out, check: true },
      logger
    );
    expect(checkResult).toBe(1);
    expect(logger.errors.join('\n')).toContain(out);
  });

  it('--check against a file that never existed exits 1 and says so, not "stale"', async () => {
    const out = await tmpOut();
    const logger = collectingLogger();
    const checkResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out, check: true },
      logger
    );
    expect(checkResult).toBe(1);
    const errorText = logger.errors.join('\n');
    expect(errorText).toContain('does not exist');
    expect(errorText).not.toContain('stale');
  });

  it('a typo’d --out directory is a one-line diagnosis, not a stack trace', async () => {
    const out = path.join(tmpdir(), `rc-missing-dir-${Date.now()}`, 'sub', 'tags.yaml');
    const logger = collectingLogger();
    const writeResult = await generateMarkdocSchema(
      { from: [fixture('module-a.ts')], out },
      logger
    );
    expect(writeResult).toBe(1);
    const errorText = logger.errors.join('\n');
    expect(errorText).toContain('could not write');
    expect(errorText).toContain(out);
    expect(errorText).not.toContain('    at '); // no stack frames reach the user
  });
});
