import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverFilesForRoots, rootForFile, toRoots } from '../roots.js';

describe('toRoots', () => {
  it('wraps a single path in an array', () => {
    expect(toRoots('docs')).toEqual(['docs']);
  });

  it('keeps several paths in order', () => {
    expect(toRoots(['guides', 'reference'])).toEqual(['guides', 'reference']);
  });

  it('falls back to the current directory when no path is given', () => {
    expect(toRoots([])).toEqual(['.']);
  });
});

describe('discoverFilesForRoots', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-roots-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('lists a file once when roots repeat or overlap, in first-seen root order', async () => {
    const guides = path.join(tempDir, 'guides');
    await fs.mkdir(guides);
    const guide = path.join(guides, 'guide.md');
    const top = path.join(tempDir, 'top.md');
    await fs.writeFile(guide, '# Guide\n');
    await fs.writeFile(top, '# Top\n');

    // `guides` is walked first, then the parent (which re-finds guide.md),
    // then guide.md itself as a file root.
    const files = await discoverFilesForRoots([guides, tempDir, guide]);

    expect(files).toEqual([guide, top]);
  });
});

describe('rootForFile', () => {
  const cwd = process.cwd();

  it('returns the root that contains the file', () => {
    expect(rootForFile('docs/guides/a.md', ['docs'])).toBe(path.join(cwd, 'docs'));
  });

  it('returns the file directory when the root is the file itself', () => {
    expect(rootForFile('docs/README.md', ['docs/README.md'])).toBe(path.join(cwd, 'docs'));
  });

  it('picks the first matching root in order', () => {
    expect(rootForFile('docs/guides/a.md', ['docs/guides', 'docs'])).toBe(
      path.join(cwd, 'docs', 'guides')
    );
  });

  it('does not treat a sibling with a shared prefix as an ancestor', () => {
    expect(rootForFile('docs-old/a.md', ['docs'])).toBe(path.join(cwd, 'docs-old'));
  });

  it('falls back to the file directory outside every root', () => {
    const outside = path.resolve('/elsewhere/a.md');
    expect(rootForFile(outside, ['docs'])).toBe(path.dirname(outside));
  });
});
