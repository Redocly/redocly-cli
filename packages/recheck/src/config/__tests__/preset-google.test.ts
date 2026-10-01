import { describe, expect, it } from 'vitest';

import { unreportedPairs } from './swap-pair-coverage.js';

// Regex keys (`keysAreRegex`) need literal trigger text, for example `vs.` for `\bvs\.`. Every regex
// key needs an entry here, by rule name and regex source, or the test fails and names the key.
const REGEX_KEY_EXAMPLES: Record<string, Record<string, string>> = {
  'google/no-latinisms': {
    '\\bi\\.e\\.': 'i.e.',
    '\\be\\.g\\.': 'e.g.',
  },
  'google/vs-versus': {
    '\\bvs\\.': 'vs.',
  },
  'google/no-slash-abbrev': {
    '\\bc/o(?![A-Za-z])': 'c/o',
    '\\bw/(?![A-Za-z])': 'w/',
  },
  'google/acronym-forms': {
    'OAuth 2(?!\\.0)': 'OAuth 2',
  },
  'google/sha1-form': {
    '(?<!-)\\bSHA1\\b': 'SHA1',
  },
  'google/product-names': {
    '(?<![Gg][Oo][Oo][Gg][Ll][Ee]\\s+)Cloud console': 'Cloud console',
  },
};

describe('recheck/google per-pair coverage', () => {
  it('every swap pair key in the preset fires at least once', async () => {
    expect(await unreportedPairs('recheck/google', REGEX_KEY_EXAMPLES)).toEqual([]);
  });
});
