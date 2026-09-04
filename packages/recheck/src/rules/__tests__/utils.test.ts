import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { NormalizedRule } from '../../types/index.js';
import { shouldProcessFile, shouldSkipLine } from '../utils.js';

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

    it('should not process files that shouldProcessFile returns false for', async () => {
      const file = path.join(tempDir, 'style-guide.md');
      const rule = createTestRule({ files: ['style-guide.md'] });
      const shouldProcess = shouldProcessFile(file, rule);
      // File should be excluded based on exception pattern
      expect(shouldProcess).toBe(false);
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
