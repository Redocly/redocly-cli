import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { lintContent } from '../../index.js';
import { validate } from '../validate.js';

const RULE = {
  'recheck/markdoc-unknown-tag': {
    severity: 'warn',
    message: 'Unknown tag "%s".',
    assertions: { 'markdoc-unknown-tag': {} },
  },
} as const;

describe('markdoc.extend.tagsFile', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'recheck-tagsfile-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeTags(yaml: string): Promise<string> {
    const file = join(dir, 'tags.yaml');
    await writeFile(file, yaml, 'utf8');
    return file;
  }

  it('a tag from the file is known to the unknown-tag rule', async () => {
    await writeTags('my-widget:\n  selfClosing: true\n  attributes:\n    id: { type: string }\n');
    const problems = await lintContent(
      '{% my-widget id="a" /%}\n',
      { markdoc: { schema: 'realm', extend: { tagsFile: './tags.yaml' } }, ...RULE },
      { configDir: dir }
    );
    expect(problems).toEqual([]);
  });

  it('inline tags win over the file on collision (base <- tagsFile <- tags)', async () => {
    await writeTags('my-widget:\n  attributes:\n    size: { type: string, enum: [small] }\n');
    const config = {
      markdoc: {
        schema: 'realm',
        extend: {
          tagsFile: './tags.yaml',
          tags: { 'my-widget': { attributes: { size: { type: 'string', enum: ['large'] } } } },
        },
      },
      'recheck/markdoc-attributes': {
        severity: 'error',
        message: 'Attribute problem: %s.',
        assertions: { 'markdoc-attributes': {} },
      },
    };
    // size="large" violates the FILE's enum but satisfies the INLINE one;
    // inline wins, so no problem is reported.
    const problems = await lintContent(
      '{% my-widget size="large" /%}\n{% /my-widget %}\n',
      config,
      {
        configDir: dir,
      }
    );
    expect(problems.filter((p) => p.ruleName.includes('markdoc-attributes'))).toEqual([]);
  });

  it('missing file is a config error naming path and resolved location', async () => {
    const result = await validate(
      { markdoc: { schema: 'realm', extend: { tagsFile: './nope.yaml' } }, ...RULE },
      { configDir: dir }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === '/markdoc/extend/tagsFile')).toBe(true);
    expect(result.errors.some((e) => e.message.includes(join(dir, 'nope.yaml')))).toBe(true);
  });

  it('unparseable YAML is a config error at the same path', async () => {
    await writeTags('my-widget: [unclosed\n');
    const result = await validate(
      { markdoc: { schema: 'realm', extend: { tagsFile: './tags.yaml' } }, ...RULE },
      { configDir: dir }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === '/markdoc/extend/tagsFile')).toBe(true);
  });

  it('a file tag failing the tag-schema shape is a config error naming the tag', async () => {
    await writeTags('my-widget:\n  attributes:\n    id: { type: number, bogusKey: 1 }\n');
    const result = await validate(
      { markdoc: { schema: 'realm', extend: { tagsFile: './tags.yaml' } }, ...RULE },
      { configDir: dir }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path.startsWith('/markdoc/extend/tagsFile'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('my-widget'))).toBe(true);
  });

  it('extend with only tagsFile (no inline tags) validates', async () => {
    await writeTags('my-widget: { selfClosing: true }\n');
    const result = await validate(
      { markdoc: { schema: 'realm', extend: { tagsFile: './tags.yaml' } }, ...RULE },
      { configDir: dir }
    );
    expect(result.isValid).toBe(true);
  });

  it('tagsFile is not read when markdoc parsing is off', async () => {
    // A config error for a missing file must NOT appear: the file is only
    // loaded when the markdoc option enables parsing.
    const result = await validate(
      { 'recheck/x': { severity: 'warn', message: 'm', assertions: { 'no-trailing-spaces': {} } } },
      { configDir: dir }
    );
    expect(result.isValid).toBe(true);
  });

  it('a structurally invalid markdoc block never triggers the tagsFile read', async () => {
    // The file load must run only after structural validation passes: a
    // config that fails AJV should surface exactly its structural errors,
    // never a file-read error for a tagsFile it happens to reference.
    // Reordering the load ahead of the structural short-circuit would leak
    // a "could not read" error here.
    const result = await validate(
      {
        markdoc: { schema: 'bogus', extend: { tagsFile: './definitely-missing.yaml' } },
        ...RULE,
      } as never,
      { configDir: dir }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === '/markdoc/schema')).toBe(true);
    expect(result.errors.some((e) => /could not (read|parse)/i.test(e.message))).toBe(false);
  });
});
