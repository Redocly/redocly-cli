import type { ReadabilityRunResult } from '@redocly/recheck';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../__tests__/capture-logger.js';
import { outputReadabilityTable } from '../readability.js';

afterEach(() => vi.restoreAllMocks());

describe('outputReadabilityTable', () => {
  it('prints a dash for each score a file could not get', () => {
    const { stdout } = captureLogger();
    const result = {
      rows: [
        {
          file: 'docs/scored.md',
          words: 120,
          sentences: 8,
          fleschReadingEase: 61.234,
          fleschKincaidGrade: 8.06,
          automatedReadabilityIndex: 7.5,
        },
        {
          file: 'docs/empty.md',
          words: 0,
          sentences: 0,
          fleschReadingEase: null,
          fleschKincaidGrade: null,
          automatedReadabilityIndex: null,
        },
      ],
    } as ReadabilityRunResult;

    outputReadabilityTable(result);

    expect(stdout.join('')).toBe(
      '\n' +
        '   FRE     Grade     ARI   Words   Sentences  File\n' +
        '  61.2    8.1     7.5     120          8  docs/scored.md\n' +
        '     —      —       —       0          0  docs/empty.md\n' +
        '\n'
    );
  });
});
