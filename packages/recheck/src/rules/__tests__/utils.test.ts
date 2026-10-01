import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { ScopedSegment } from '../../scopes/types.js';
import type { NormalizedRule } from '../../types/index.js';
import {
  fileMatchesAnyPattern,
  nonProseRanges,
  shouldProcessFile,
  shouldSkipLine,
} from '../utils.js';

describe('exceptions', () => {
  let tempDir: string;

  function createTestRule(exceptions?: { files?: string[]; lines?: string[] }): NormalizedRule {
    return {
      name: 'recheck/no-trailing-spaces',
      shortName: 'no-trailing-spaces',
      severity: 'error',
      message: 'Remove trailing spaces.',
      link: '',
      scope: 'all',
      exceptions,
      assertions: { 'no-trailing-spaces': {} },
    };
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_e) {
      // ignore
    }
  });

  describe('file exceptions', () => {
    it('should skip files matching basename pattern', async () => {
      const file = path.join(tempDir, 'docs/style-guide.md');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, 'content');

      const rule = createTestRule({ files: ['style-guide.md'] });
      const shouldProcess = shouldProcessFile(file, rule);

      expect(shouldProcess).toBe(false);
    });

    it('should skip files matching relative path pattern', async () => {
      const file = path.join(tempDir, 'docs/style-guide.md');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, 'content');

      const rule = createTestRule({ files: ['docs/style-guide.md'] });
      const shouldProcess = shouldProcessFile(file, rule);

      expect(shouldProcess).toBe(false);
    });

    it('should skip files matching glob pattern', async () => {
      const file = path.join(tempDir, 'docs/api-reference.md');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, 'content');

      const rule = createTestRule({ files: ['docs/*.md'] });
      const shouldProcess = shouldProcessFile(file, rule);

      expect(shouldProcess).toBe(false);
    });

    it('should process files not matching exception patterns', async () => {
      const file = path.join(tempDir, 'regular-doc.md');
      await fs.writeFile(file, 'content');

      const rule = createTestRule({ files: ['style-guide.md'] });
      const shouldProcess = shouldProcessFile(file, rule);

      expect(shouldProcess).toBe(true);
    });
  });

  describe('excludes and appliesTo', () => {
    const inDocs = path.join(process.cwd(), 'docs/page.md');
    const inBlog = path.join(process.cwd(), 'blog/post.md');

    it('should skip files matching an excludes pattern', () => {
      const rule = { ...createTestRule(), excludes: ['blog/**'] };
      expect(shouldProcessFile(inBlog, rule)).toBe(false);
      expect(shouldProcessFile(inDocs, rule)).toBe(true);
    });

    it('should process only files matching an appliesTo pattern', () => {
      const rule = { ...createTestRule(), appliesTo: ['docs/**'] };
      expect(shouldProcessFile(inDocs, rule)).toBe(true);
      expect(shouldProcessFile(inBlog, rule)).toBe(false);
    });

    it('should let excludes win over appliesTo', () => {
      const rule = { ...createTestRule(), appliesTo: ['docs/**'], excludes: ['docs/page.md'] };
      expect(shouldProcessFile(inDocs, rule)).toBe(false);
    });
  });

  describe('fileMatchesAnyPattern', () => {
    it('should match when any pattern matches the basename, relative path, or a path suffix', () => {
      const file = path.join(process.cwd(), 'docs/guides/intro.md');
      expect(fileMatchesAnyPattern(file, ['nope.md', 'intro.md'])).toBe(true);
      expect(fileMatchesAnyPattern(file, ['docs/**'])).toBe(true);
      expect(fileMatchesAnyPattern(file, ['guides/*.md'])).toBe(true);
    });

    it('should not match when no pattern matches, or when the list is empty', () => {
      const file = path.join(process.cwd(), 'docs/guides/intro.md');
      expect(fileMatchesAnyPattern(file, ['blog/**', '*.mdx'])).toBe(false);
      expect(fileMatchesAnyPattern(file, [])).toBe(false);
    });
  });

  describe('line exceptions', () => {
    it('should skip lines containing exception text', () => {
      const rule = createTestRule({ lines: ['British spellings such as'] });

      const shouldSkip1 = shouldSkipLine(
        'British spellings such as "colour" are allowed here',
        rule
      );
      const shouldSkip2 = shouldSkipLine('Normal content with trailing spaces   ', rule);

      expect(shouldSkip1).toBe(true);
      expect(shouldSkip2).toBe(false);
    });

    it('should support multiple line exception patterns', () => {
      const rule = createTestRule({ lines: ['Code example:', '// ignore-lint'] });

      const shouldSkip1 = shouldSkipLine('Code example: const x = 1;   ', rule);
      const shouldSkip2 = shouldSkipLine('const y = 2; // ignore-lint   ', rule);
      const shouldSkip3 = shouldSkipLine('Regular content   ', rule);

      expect(shouldSkip1).toBe(true);
      expect(shouldSkip2).toBe(true);
      expect(shouldSkip3).toBe(false);
    });

    it('should work case-sensitively', () => {
      const rule = createTestRule({ lines: ['Code Example'] });

      const shouldSkip1 = shouldSkipLine('Code Example: test   ', rule);
      const shouldSkip2 = shouldSkipLine('code example: test   ', rule);

      expect(shouldSkip1).toBe(true);
      expect(shouldSkip2).toBe(false);
    });
  });
});

describe('nonProseRanges', () => {
  const segment = (content: string, maskedRanges?: ScopedSegment['maskedRanges']) =>
    ({ content, maskedRanges }) as ScopedSegment;

  it('should return the inline code spans of the segment', () => {
    expect(nonProseRanges(segment('use `a` and `b`'))).toEqual([
      { start: 4, end: 7 },
      { start: 12, end: 15 },
    ]);
  });

  it('should skip code spans when includeCode is set', () => {
    expect(nonProseRanges(segment('use `a`'), true)).toEqual([]);
  });

  it('should add the masked markdoc ranges to the code spans, and keep them when includeCode is set', () => {
    const masked = [{ start: 0, end: 3 }];
    const seg = segment('xxx `a`', masked);
    expect(nonProseRanges(seg)).toEqual([{ start: 4, end: 7 }, ...masked]);
    expect(nonProseRanges(seg, true)).toEqual(masked);
  });
});
