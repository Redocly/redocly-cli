import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { validate } from '../config/validate.js';
import { lintFiles } from '../index.js';
import type { RecheckConfig } from '../types/index.js';

describe('lintFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-lint-files-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads image metadata from disk so max-image-size can flag oversized images', async () => {
    const imagePath = path.join(tempDir, 'large.png');
    await fs.writeFile(imagePath, Buffer.alloc(2048, 0)); // 2KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Doc\n\n![Large image](./large.png)\n');

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    // root: image metadata is confined to the lint root (default cwd);
    // these fixtures live under os.tmpdir(), so the root must be passed.
    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('large.png');
  });

  it('flags oversized inline AND reference-style images end-to-end (extractImageReferences <-> max-image-size key parity)', async () => {
    // Proves FIX B's core/files.ts extraction (which builds the
    // fileMetadata.images Map keys) and FIX A's max-image-size rule (which
    // looks images up in that same Map) agree on exactly the same
    // destination strings for both inline and reference-style syntax --
    // the "same normalization on both sides" requirement. A key mismatch
    // here would silently make oversized reference-style images (or, if
    // the mismatch went the other way, inline ones) un-flaggable.
    const inlineImagePath = path.join(tempDir, 'inline-large.png');
    await fs.writeFile(inlineImagePath, Buffer.alloc(2048, 0)); // 2KB

    const refImagePath = path.join(tempDir, 'ref-large.png');
    await fs.writeFile(refImagePath, Buffer.alloc(2048, 0)); // 2KB

    const smallImagePath = path.join(tempDir, 'small.png');
    await fs.writeFile(smallImagePath, Buffer.alloc(512, 0)); // 0.5KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(
      mdPath,
      [
        '# Doc',
        '',
        '![Inline image](./inline-large.png)',
        '',
        '![Reference image][big]',
        '',
        '![Small image](./small.png)',
        '',
        '[big]: ./ref-large.png',
        '',
      ].join('\n')
    );

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(2);
    const messages = problems.map((p) => p.message).sort();
    expect(messages[0]).toContain('inline-large.png');
    expect(messages[1]).toContain('ref-large.png');
  });

  it('does not flag images within the size limit', async () => {
    const imagePath = path.join(tempDir, 'small.png');
    await fs.writeFile(imagePath, Buffer.alloc(512, 0)); // 0.5KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Doc\n\n![Small image](./small.png)\n');

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(0);
  });

  it('only writes fixed files back to disk when opts.fix is set', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    const original = '# Doc\nTrailing spaces here   \n';
    await fs.writeFile(mdPath, original);

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const withoutFix = await lintFiles([mdPath], config);
    expect(withoutFix.fixedFiles.size).toBe(0); // fixes aren't computed without opts.fix
    expect(await fs.readFile(mdPath, 'utf8')).toBe(original); // unchanged on disk

    const withFix = await lintFiles([mdPath], config, { fix: true });
    expect(withFix.fixedFiles.get(mdPath)).toBe('# Doc\nTrailing spaces here\n');
    expect(await fs.readFile(mdPath, 'utf8')).toBe('# Doc\nTrailing spaces here\n');
  });

  it('converges ul-style + no-hard-tabs + no-trailing-spaces in a single lintFiles({fix:true}) call', async () => {
    // Regression for FIX 3: this fixture previously needed 3 separate --fix
    // passes to fully converge (whole-line no-hard-tabs fixes discarded
    // sibling fixes on the same line; see fix-idempotency.test.ts for the
    // isolated runRules-level repro). lintFiles must loop internally until a
    // pass produces zero fixes so callers get a fully-fixed file in one call.
    //
    // `strict: true` on no-trailing-spaces: the tab->2-spaces fix from
    // no-hard-tabs leaves exactly 2 trailing spaces, which MD009's default
    // `brSpaces: 2` semantics treat as an intentional Markdown hard line
    // break (not flagged). `strict: true` restores "flag ALL trailing
    // whitespace" so this fixture still exercises the same-line multi-rule
    // fix conflict it was designed for.
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '* bullet one\t\n');

    const config: RecheckConfig = {
      'recheck/ul-style': {
        severity: 'error',
        message: 'Use "-" bullets.',
        assertions: { 'ul-style': { style: 'dash' } },
      },
      'recheck/no-hard-tabs': {
        severity: 'error',
        message: 'Use spaces instead of tabs.',
        assertions: { 'no-hard-tabs': { codeBlocks: false, spacesPerTab: 2 } },
      },
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'Remove trailing spaces.',
        assertions: { 'no-trailing-spaces': { codeBlocks: false, strict: true } },
      },
    };

    const { fixedFiles } = await lintFiles([mdPath], config, { fix: true });
    const fixedContent = fixedFiles.get(mdPath);
    expect(fixedContent).toBe('- bullet one\n');

    // A fresh lint of the fixed file must report zero problems from the
    // three rules above — nothing left to fix.
    const { problems } = await lintFiles([mdPath], config);
    expect(problems).toEqual([]);
  });

  it('warns and skips an unreadable file but still lints the readable ones', async () => {
    const goodPath = path.join(tempDir, 'good.md');
    await fs.writeFile(goodPath, 'Trailing spaces here   \n');

    const unreadablePath = path.join(tempDir, 'unreadable.md');
    await fs.writeFile(unreadablePath, 'Trailing spaces here   \n');
    await fs.chmod(unreadablePath, 0o000);

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { problems } = await lintFiles([goodPath, unreadablePath], config);

      expect(problems).toHaveLength(1);
      expect(problems[0].file).toBe(goodPath);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`could not read ${unreadablePath}`)
      );
    } finally {
      warnSpy.mockRestore();
      await fs.chmod(unreadablePath, 0o644);
    }
  });

  it('reports unreadable files in skippedFiles so callers can detect incomplete coverage', async () => {
    // The console.warn alone gives a programmatic caller (e.g. a security
    // review consuming lint results) no signal that a file was silently
    // dropped from coverage — the returned skippedFiles list is that signal.
    const goodPath = path.join(tempDir, 'good.md');
    await fs.writeFile(goodPath, 'Clean content.\n');

    const unreadablePath = path.join(tempDir, 'unreadable.md');
    await fs.writeFile(unreadablePath, 'Whatever.\n');
    await fs.chmod(unreadablePath, 0o000);

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { skippedFiles } = await lintFiles([goodPath, unreadablePath], config);

      expect(skippedFiles).toHaveLength(1);
      expect(skippedFiles[0].path).toBe(unreadablePath);
      expect(skippedFiles[0].reason).toMatch(/permission denied|EACCES/i);
    } finally {
      warnSpy.mockRestore();
      await fs.chmod(unreadablePath, 0o644);
    }
  });

  it('returns an empty skippedFiles array when every file is readable', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, 'Clean content.\n');

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const { skippedFiles } = await lintFiles([mdPath], config);
    expect(skippedFiles).toEqual([]);
  });

  it('honors opts.maxProblems, capping problems and reporting truncated', async () => {
    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    // Three files, four problem lines each.
    const paths: string[] = [];
    for (const name of ['a.md', 'b.md', 'c.md']) {
      const filePath = path.join(tempDir, name);
      await fs.writeFile(filePath, 'w \nx \ny \nz \n');
      paths.push(filePath);
    }

    const capped = await lintFiles(paths, config, { maxProblems: 5 });
    expect(capped.problems).toHaveLength(5);
    expect(capped.truncated).toBe(true);
    // The cap was hit during b.md, so c.md contributes nothing.
    expect(capped.problems.some((p) => p.file === paths[2])).toBe(false);

    const uncapped = await lintFiles(paths, config);
    expect(uncapped.problems).toHaveLength(12);
    expect(uncapped.truncated).toBe(false);
  });

  it('accepts pre-normalized NormalizedRule[] and skips config validation', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Installing things\n');

    const config: RecheckConfig = {
      'recheck/no-gerund-headings': {
        severity: 'error',
        scope: ['heading.h1'],
        message: 'No gerunds.',
        assertions: { pattern: { ignoreCase: true, tokens: ['^\\w*ing\\b.*'] } },
      },
    };

    const { rules } = await validate(config);
    const { problems } = await lintFiles([mdPath], rules);

    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toContain('no-gerund-headings');
  });
});
