import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import type { NormalizedRule, SpellingAssertion } from '../../../types/index.js';
import { spelling } from '../spelling.js';
import { buildScopedContext, expectInvalidOptions, expectValidOptions } from './helpers.js';

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
  const MESSAGE = 'Unknown word "%s"%s';

  async function misspelled(content: string, options: SpellingAssertion = {}) {
    const ctx = buildScopedContext(content, isProseScope);
    const problems = await spelling.execute(spellingRule(MESSAGE, options), 'test.md', ctx);
    return problems.map((problem) => problem.match);
  }

  it('flags a misspelled word with suggestions in the message and its position', async () => {
    const content = 'This is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);

    const problems = await spelling.execute(spellingRule(MESSAGE, {}), 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('wrold');
    expect(problems[0].message).toBe('Unknown word "wrold" — did you mean: wold, world?');
    // 'This is a ' is 10 chars, so 'wrold' starts at column 11.
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(11);
  });

  it.each<[string, string, SpellingAssertion, string[]]>([
    ['correctly spelled prose', 'This is a world of possibilities.\n', {}, []],
    // `vocab` entries match regardless of case.
    [
      'a word in `vocab`, in any case',
      'Welcome to redocly, powered by ACMESOFT tech.\n',
      { vocab: ['Redocly', 'Acmesoft'] },
      [],
    ],
    // 'acmesoft' is not in the built-in vocabulary. 'redocly' is, so it cannot be used here.
    [
      'a word absent from `vocab`',
      'Welcome to acmesoft software.\n',
      { vocab: ['other-word'] },
      ['acmesoft'],
    ],
    [
      'a token matching an `ignore` regex',
      'Contact Acmesoft for details.\n',
      { ignore: ['\\bAcme\\w*'] },
      [],
    ],
    // An invalid `ignore` regex is skipped, same convention as pattern.ts.
    [
      'an invalid `ignore` regex',
      'This is a wrold of possibilities.\n',
      { ignore: ['(unterminated'] },
      ['wrold'],
    ],
    ['an ALL-CAPS token the speller does not know', 'The XYZQQQ system is running.\n', {}, []],
    ['a capitalized misspelling, which is not ALL-CAPS', 'Xyzqqq is not a word.\n', {}, ['Xyzqqq']],
    // Inline code stays in a paragraph's `content`, so those spans are masked before checking.
    [
      'a misspelling inside an inline code span',
      'Set the `wrold` option to enable this.\n',
      {},
      [],
    ],
    [
      'a misspelling beside a frozen inline code span',
      'Set the `wrold` option, it is a wrold-class feature.\n',
      {},
      ['wrold'],
    ],
    [
      'a misspelling inside a double-backtick span',
      'Set the ``wrold`` option to enable this.\n',
      {},
      [],
    ],
    // ``wrold ` inside`` is one code span that contains a single backtick.
    [
      'a misspelling inside a span containing a literal backtick',
      'Set the ``wrold ` inside`` option.\n',
      {},
      [],
    ],
    // A word touching a digit is a fragment of an identifier, so it is skipped: both 'log' and 'j' in 'log4j'.
    [
      'letter-run fragments of digit-bearing identifiers',
      'Hash it with sha256, encode as utf8, authenticate via oauth2, target es6, and log with log4j.\n',
      {},
      [],
    ],
    [
      'a genuine misspelling beside digit-adjacent identifiers',
      'Using sha256 and utf8, this is a wrold of possibilities.\n',
      {},
      ['wrold'],
    ],
    ['a fragment with a leading digit neighbor', 'This is 2fsat for me.\n', {}, []],
    // A fenced code block is a `code` scope segment, so it is never part of the prose segments.
    [
      'a fenced code block when scoped to prose',
      'This is fine prose.\n\n```js\nconst wrold = 1; // recieve\n```\n\nMore fine prose.\n',
      {},
      [],
    ],
    // The built-in proper nouns are accepted by default. Multi-word entries are split into single words.
    ['a built-in noun with no vocab configured', 'Deploy with OpenAPI and pnpm today.\n', {}, []],
    ['a multi-token built-in entry', 'Deploy with Node.js and VS Code today.\n', {}, []],
    [
      'the built-ins alongside the rule’s own vocab',
      'Deploy with OpenAPI and Acmesoft today.\n',
      { vocab: ['Acmesoft'] },
      [],
    ],
    [
      'a built-in noun when builtinVocabulary is false',
      'Deploy with OpenAPI today.\n',
      { builtinVocabulary: false },
      ['OpenAPI'],
    ],
    [
      'the rule’s own vocab when builtinVocabulary is false',
      'Deploy with Acmesoft today.\n',
      { vocab: ['Acmesoft'], builtinVocabulary: false },
      [],
    ],
  ])('on %s reports %j', async (_label, content, options, expected) => {
    expect(await misspelled(content, options)).toEqual(expected);
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

  // The two `%s` slots are the word and the suggestion suffix, which is empty when there are no suggestions.
  it.each([
    ['This is a wrold of possibilities.\n', 'Unknown word "wrold" — did you mean: wold, world?'],
    ['The zzzzqqqqxxxx thing is broken.\n', 'Unknown word "zzzzqqqqxxxx"'],
  ])('uses the fallback message for a rule without `message` on %j', async (content, expected) => {
    const rule: NormalizedRule = {
      name: 'recheck/spelling-check',
      shortName: 'spelling-check',
      severity: 'error',
      scope: 'paragraph',
      assertions: { spelling: {} },
    };

    const { problems } = await runRules([{ path: 't.md', content }], [rule]);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe(expected);
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

    it.each<[string, Record<string, unknown>]>([
      ['an empty config (all-default)', {}],
      ['builtinVocabulary: true', { builtinVocabulary: true }],
      ['builtinVocabulary: false', { builtinVocabulary: false }],
    ])('accepts %s', async (_label, options) => {
      await expectValidOptions('spelling', options);
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['an unknown option', { bogus: true }, 'bogus'],
      ['an empty-string dictionary', { dictionary: '' }, 'dictionary'],
      ['a non-string dictionary', { dictionary: 42 }, 'dictionary'],
      ['a non-array vocab', { vocab: 'not-an-array' }, 'vocab'],
      ['a vocab array with an empty-string entry', { vocab: ['ok', ''] }, 'vocab'],
      ['a non-array ignore', { ignore: 'not-an-array' }, 'ignore'],
      ['an ignore array with a non-string entry', { ignore: [123] }, 'ignore'],
      ['a non-boolean builtinVocabulary', { builtinVocabulary: 'yes' }, 'builtinVocabulary'],
    ])('rejects %s', async (_label, options, mention) => {
      await expectInvalidOptions('spelling', options, mention);
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
  });
});
