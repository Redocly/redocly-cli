import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, SpellingAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { spelling, formatSuggestionSuffix } from '../spelling.js';

// Builds a rule context with only the segments whose scope matches the filter.
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

function spellingRule(
  message: string | undefined,
  options: SpellingAssertion,
  overrides: Partial<NormalizedRule> = {}
): NormalizedRule {
  return {
    name: 'test-spelling',
    shortName: 'spelling',
    severity: 'error',
    message,
    assertions: { spelling: options },
    ...overrides,
  };
}

const isProseScope = (scope: string) =>
  scope === 'paragraph' ||
  scope === 'heading' ||
  scope.startsWith('heading.') ||
  scope === 'list-item' ||
  scope === 'blockquote';

const tmpDirs: string[] = [];
async function makeTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-spelling-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('spelling assertion', () => {
  it('flags a misspelled word with up to three suggestions in the message', async () => {
    const content = 'This is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('wrold');
    expect(problems[0].message).toBe('Unknown word "wrold" — did you mean: wold, world?');
    // 'This is a ' is 10 chars, so 'wrold' starts at column 11.
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(11);
  });

  it('reports nothing for correctly spelled prose', async () => {
    const content = 'This is a world of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('honors a `vocab` list (case-insensitive), built here from a one-word-per-line tmp file', async () => {
    const dir = await makeTmpDir();
    const vocabFile = path.join(dir, 'vocab.txt');
    await fs.writeFile(vocabFile, 'Redocly\nAcmesoft\n', 'utf8');
    const vocabWords = (await fs.readFile(vocabFile, 'utf8'))
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const content = 'Welcome to redocly, powered by ACMESOFT tech.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', { vocab: vocabWords });

    const problems = await spelling.execute(rule, 'test.md', ctx);

    // 'redocly' and 'ACMESOFT' must match the vocab entries 'Redocly' and 'Acmesoft' regardless of case.
    expect(problems).toEqual([]);
  });

  it('flags an unrecognized word absent from `vocab`', async () => {
    // 'acmesoft' is not in the built-in vocabulary. 'redocly' is, so it cannot be used here.
    const content = 'Welcome to acmesoft software.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', { vocab: ['other-word'] });

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems.map((p) => p.match)).toEqual(['acmesoft']);
  });

  it('skips tokens matching an `ignore` regex', async () => {
    const content = 'Contact Acmesoft for details.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', { ignore: ['\\bAcme\\w*'] });

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('an invalid `ignore` regex is silently skipped (same convention as pattern.ts)', async () => {
    const content = 'This is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', { ignore: ['(unterminated'] });

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems.map((p) => p.match)).toEqual(['wrold']);
  });

  it('skips ALL-CAPS tokens (length >= 2), even when the speller does not recognize them', async () => {
    const content = 'The XYZQQQ system is running.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('does not skip a capitalized (not ALL-CAPS) misspelling', async () => {
    const content = 'Xyzqqq is not a word.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems.map((p) => p.match)).toEqual(['Xyzqqq']);
  });

  // Inline code stays in a paragraph's `content`, so those spans are masked before checking and a misspelling inside backticks is not reported.
  it('does not flag a misspelling inside an inline code span', async () => {
    const content = 'Set the `wrold` option to enable this.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('still flags a real misspelling alongside a frozen inline code span in the same segment', async () => {
    const content = 'Set the `wrold` option, it is a wrold-class feature.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('wrold');
  });

  // Multi-backtick spans (``wrold``) must be masked too.
  describe('multi-backtick code spans', () => {
    it('does not flag a misspelling inside a double-backtick span', async () => {
      const content = 'Set the ``wrold`` option to enable this.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('still flags the same misspelling when it occurs OUTSIDE the double-backtick span (control)', async () => {
      const content = 'Set the ``wrold`` option, but wrold outside is flagged.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('wrold');
    });

    it('does not flag a misspelling inside a double-backtick span whose content itself contains a literal backtick -- the motivating CommonMark case', async () => {
      // ``wrold ` inside`` is one code span that contains a single backtick.
      const content = 'Set the ``wrold ` inside`` option.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  // A fenced code block is a `code` scope segment, so it is never part of the prose segments.
  it('never sees a fenced code block when scoped to prose (misspelling inside stays unreported)', async () => {
    const content =
      'This is fine prose.\n\n```js\nconst wrold = 1; // recieve\n```\n\nMore fine prose.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // The word pattern matches letters only, so 'config2' gives the fragment 'config'. That fragment is skipped because a digit follows it. A number like '42' has no letters, so it gives no word.
  it('a digit-adjacent identifier tokenizes to its letter-only prefix, which is now skipped rather than flagged', async () => {
    const content = 'Run config2 now, not 42 times.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // A word touching a digit is a fragment of an identifier, so it is skipped: 'sha256', 'utf8', 'oauth2', 'es6', and both 'log' and 'j' in 'log4j'.
  it('does not flag letter-run fragments of common digit-bearing identifiers (sha256, utf8, oauth2, es6, log4j)', async () => {
    const content =
      'Hash it with sha256, encode as utf8, authenticate via oauth2, target es6, and log with log4j.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // A real misspelling in the same sentence must still be flagged.
  it('still flags a genuine standalone misspelling alongside digit-adjacent identifiers in the same sentence', async () => {
    const content = 'Using sha256 and utf8, this is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems.map((p) => p.match)).toEqual(['wrold']);
  });

  // The digit can also come before the word, as in '2fast'.
  it('does not flag a fragment with a leading digit neighbor (e.g. "2fast")', async () => {
    const content = 'This is 2fast for me.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // The `dictionary-en` package exports the raw `{aff, dic}` content, so the test writes it to a temporary `.aff` and `.dic` pair.
  it('loads a custom dictionary from a `dictionary` path (built from the dictionary-en dev dependency)', async () => {
    const dictionaryEn = (await import('dictionary-en')).default;
    const dir = await makeTmpDir();
    const base = path.join(dir, 'custom');
    await fs.writeFile(`${base}.aff`, dictionaryEn.aff);
    await fs.writeFile(`${base}.dic`, dictionaryEn.dic);

    const content = 'This is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', { dictionary: base });

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('wrold');
  });

  it('a custom dictionary path is resolved relative to process.cwd() when not absolute', async () => {
    const dictionaryEn = (await import('dictionary-en')).default;
    const dir = await makeTmpDir();
    await fs.writeFile(path.join(dir, 'custom.aff'), dictionaryEn.aff);
    await fs.writeFile(path.join(dir, 'custom.dic'), dictionaryEn.dic);

    const originalCwd = process.cwd();
    process.chdir(dir);
    try {
      const content = 'This is a wrold of possibilities.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', { dictionary: 'custom' });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('wrold');
    } finally {
      process.chdir(originalCwd);
    }
  });

  describe('formatSuggestionSuffix', () => {
    it('returns an empty string for zero suggestions', () => {
      expect(formatSuggestionSuffix([])).toBe('');
    });

    it('formats one suggestion', () => {
      expect(formatSuggestionSuffix(['world'])).toBe(' — did you mean: world?');
    });

    it('formats up to three suggestions, comma-joined', () => {
      expect(formatSuggestionSuffix(['wold', 'world', 'wild'])).toBe(
        ' — did you mean: wold, world, wild?'
      );
    });
  });

  it('the fallback message has exactly two %s placeholders, both substituted (word, suggestion suffix)', async () => {
    // 'zzzzqqqqxxxx' has no suggestions, so this covers the empty suffix case.
    const content = 'The zzzzqqqqxxxx thing is broken.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule(undefined, {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('Unknown word "zzzzqqqqxxxx"');
  });

  it('fallback message parity via direct runRules (no vi mocking)', async () => {
    const content = 'This is a wrold of possibilities.\n';
    const rule: NormalizedRule = {
      name: 'recheck/spelling-check',
      shortName: 'spelling-check',
      severity: 'error',
      scope: 'paragraph',
      assertions: { spelling: {} },
    };

    const { problems } = await runRules([{ path: 't.md', content }], [rule]);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('Unknown word "wrold" — did you mean: wold, world?');
  });

  // A missing or unreadable custom `dictionary` must give one visible problem per file, not zero and not one per word.
  it('a bogus dictionary path fails loudly via runRules: exactly one internal-error problem naming the dictionary failure', async () => {
    const content = 'This is a wrold of possibilities with several other words too.\n';
    const rule: NormalizedRule = {
      name: 'recheck/spelling-bogus-dictionary',
      shortName: 'spelling-bogus-dictionary',
      severity: 'error',
      scope: 'paragraph',
      assertions: {
        spelling: { dictionary: '/definitely/does/not/exist/recheck-bogus-dictionary' },
      },
    };

    const { problems } = await runRules([{ path: 't.md', content }], [rule]);

    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toBe('recheck/internal-error');
    expect(problems[0].message).toMatch(/dictionary/i);
  });

  // A failed dictionary load must not be cached: a later call retries. The dictionary files are really missing on the first call and present on the second.
  describe('speller cache eviction on rejected load', () => {
    it('evicts a rejected load: a later call with the same dictionary key retries once the files exist', async () => {
      const dictionaryEn = (await import('dictionary-en')).default;
      const dir = await makeTmpDir();
      const base = path.join(dir, 'custom');
      // The .aff and .dic files are not written yet, so the first load fails.

      const content = 'This is a wrold of possibilities.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', { dictionary: base });

      // The first call must report the failure and not cache an empty result.
      await expect(spelling.execute(rule, 'a.md', ctx)).rejects.toThrow();

      // The files now exist. A cached failure would be replayed instead of retrying.
      await fs.writeFile(`${base}.aff`, dictionaryEn.aff);
      await fs.writeFile(`${base}.dic`, dictionaryEn.dic);

      const problems = await spelling.execute(rule, 'b.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('wrold');
    });
  });

  describe('config validation', () => {
    function spellingRuleConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error' as const,
          message: 'Unknown word "%s"%s',
          assertions: { spelling: options },
        },
      };
    }

    it('accepts an empty spelling config (all-default)', async () => {
      const result = await validate(spellingRuleConfig({}));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts dictionary/vocab/ignore together when the dictionary files actually exist', async () => {
      const dictionaryEn = (await import('dictionary-en')).default;
      const dir = await makeTmpDir();
      const base = path.join(dir, 'custom');
      await fs.writeFile(`${base}.aff`, dictionaryEn.aff);
      await fs.writeFile(`${base}.dic`, dictionaryEn.dic);

      const result = await validate(
        spellingRuleConfig({
          dictionary: base,
          vocab: ['Redocly'],
          ignore: ['\\bAcme\\w*'],
        })
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    // validate() must also check that the `.aff` and `.dic` files exist, not only that `dictionary` is a string.
    it('rejects a dictionary path whose .aff/.dic files do not exist, naming the resolved paths', async () => {
      const dir = await makeTmpDir();
      const base = path.join(dir, 'missing-custom');

      const result = await validate(spellingRuleConfig({ dictionary: base }));

      expect(result.isValid).toBe(false);
      const messages = result.errors.map((error) => error.message).join('\n');
      expect(messages).toContain(`${base}.aff`);
      expect(messages).toContain(`${base}.dic`);
    });

    // A relative dictionary path is resolved from process.cwd() both when validating and when running, not from the config file's directory.
    it('resolves a relative dictionary path against process.cwd(), same as execute() does', async () => {
      const dictionaryEn = (await import('dictionary-en')).default;
      const dir = await makeTmpDir();
      await fs.writeFile(path.join(dir, 'custom.aff'), dictionaryEn.aff);
      await fs.writeFile(path.join(dir, 'custom.dic'), dictionaryEn.dic);

      const originalCwd = process.cwd();
      process.chdir(dir);
      try {
        const result = await validate(spellingRuleConfig({ dictionary: 'custom' }));
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('rejects an unknown spelling option', async () => {
      const result = await validate(spellingRuleConfig({ bogus: true }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('bogus'))).toBe(true);
    });

    it('rejects an empty-string dictionary', async () => {
      const result = await validate(spellingRuleConfig({ dictionary: '' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('dictionary'))).toBe(true);
    });

    it('rejects a non-string dictionary', async () => {
      const result = await validate(spellingRuleConfig({ dictionary: 42 }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('dictionary'))).toBe(true);
    });

    it('rejects a non-array vocab', async () => {
      const result = await validate(spellingRuleConfig({ vocab: 'not-an-array' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('vocab'))).toBe(true);
    });

    it('rejects a vocab array with an empty-string entry', async () => {
      const result = await validate(spellingRuleConfig({ vocab: ['ok', ''] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('vocab'))).toBe(true);
    });

    it('rejects a non-array ignore', async () => {
      const result = await validate(spellingRuleConfig({ ignore: 'not-an-array' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignore'))).toBe(true);
    });

    it('rejects an ignore array with a non-string entry', async () => {
      const result = await validate(spellingRuleConfig({ ignore: [123] }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignore'))).toBe(true);
    });

    it('accepts builtinVocabulary: true/false', async () => {
      const trueResult = await validate(spellingRuleConfig({ builtinVocabulary: true }));
      expect(trueResult.isValid).toBe(true);
      expect(trueResult.errors).toEqual([]);

      const falseResult = await validate(spellingRuleConfig({ builtinVocabulary: false }));
      expect(falseResult.isValid).toBe(true);
      expect(falseResult.errors).toEqual([]);
    });

    it('rejects a non-boolean builtinVocabulary', async () => {
      const result = await validate(spellingRuleConfig({ builtinVocabulary: 'yes' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('builtinVocabulary'))).toBe(true);
    });
  });

  // The built-in proper nouns are accepted by default, and `builtinVocabulary: false` turns that off. Multi-word entries are split into single words, because the spell check works one word at a time.
  describe('built-in technical proper-noun vocabulary', () => {
    it('accepts a built-in noun with no vocab configured', async () => {
      const content = 'Deploy with OpenAPI and pnpm today.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('splits a multi-token built-in entry into its individual word parts', async () => {
      const content = 'Deploy with Node.js and VS Code today.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('composes the built-ins with the rule’s own vocab rather than replacing them', async () => {
      const content = 'Deploy with OpenAPI and Acmesoft today.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', { vocab: ['Acmesoft'] });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('builtinVocabulary: false restores strict behavior: an unlisted built-in noun IS flagged', async () => {
      const content = 'Deploy with OpenAPI today.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', { builtinVocabulary: false });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems.map((p) => p.match)).toEqual(['OpenAPI']);
    });

    it('builtinVocabulary: false still honors the rule’s own vocab', async () => {
      const content = 'Deploy with Acmesoft today.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {
        vocab: ['Acmesoft'],
        builtinVocabulary: false,
      });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });
});
