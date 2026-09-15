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

// Builds a ScopeRuleContext filtered to the given scope predicate, matching
// the recipe in src/rules/CONTRIBUTING.md's "Testing" section for scoped
// rules -- same helper as occurrence.test.ts's/consistency.test.ts's/
// capitalization.test.ts's buildScopedContext.
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

    // Both 'redocly' (lowercase, vocab has 'Redocly') and 'ACMESOFT'
    // (vocab has 'Acmesoft') must match case-insensitively.
    expect(problems).toEqual([]);
  });

  it('flags an unrecognized word absent from `vocab`', async () => {
    // 'redocly' used to be this test's stand-in for "a real-ish word the
    // dictionary doesn't know and vocab doesn't list" -- but Task 8's fix
    // wave (see task-8-report.md) added 'Redocly' to the built-in
    // TECHNICAL_PROPER_NOUNS vocabulary, which `spelling` unions in by
    // default (builtinVocabulary: true), so 'redocly' is no longer
    // unrecognized here. 'acmesoft' (already this file's fictional-company
    // stand-in, see the `vocab` test above) is not in that built-in list and
    // keeps this test's original intent.
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

  // Verified against the actual extractor (see spelling.ts's own doc
  // comment): a `paragraph` segment's `content` retains inline code spans
  // as raw source text (backticks and all) -- extractScopes does not strip
  // them. This masks those spans out (same length-preserving technique as
  // capitalization.ts's freezeBacktickSpans) before tokenizing, so a
  // misspelling INSIDE backticks is silent.
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

  // Medium Bugbot finding: BACKTICK_SPAN_RE only recognized SINGLE-backtick
  // spans (`` `[^`\n]*` ``), the same masking approach capitalization.ts
  // uses. A CommonMark multi-backtick span (` ``wrold`` `) splits into two
  // adjacent EMPTY single-backtick pairs under that regex, leaving the
  // misspelling inside completely unmasked and flaggable.
  describe('multi-backtick code spans (medium Bugbot finding)', () => {
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
      // ``wrold ` inside`` is a single CommonMark code span: a 2-backtick
      // delimiter around content that itself contains one backtick. Old
      // regex's first match was the two adjacent backticks at the very
      // start (an empty pair), leaving 'wrold' exposed as a real token.
      const content = 'Set the ``wrold ` inside`` option.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', {});

      const problems = await spelling.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  // Code blocks are never checked "by construction" of the scope
  // architecture, not something spelling.ts special-cases: a fenced code
  // block is a `scope: 'code'` segment, entirely separate from the prose
  // scopes this test (like a realistic config) scopes to. It never reaches
  // `ctx.segments` in the first place.
  it('never sees a fenced code block when scoped to prose (misspelling inside stays unreported)', async () => {
    const content =
      'This is fine prose.\n\n```js\nconst wrold = 1; // recieve\n```\n\nMore fine prose.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // `/\p{L}+(?:['’]\p{L}+)?/gu` can never itself capture a digit (\p{L}
  // excludes \p{Nd}), so a digit-adjacent identifier like 'config2' still
  // tokenizes to its letter-only PREFIX ('config') as a separate match --
  // that part is unavoidable, by construction of the regex. What IS
  // resolved (see the digit-adjacency guard tests below): that fragment is
  // now skipped rather than checked as its own word, because the (masked)
  // segment text immediately after its end is a digit ('2'). A purely
  // numeric token ('42') contributes no token at all (no letters to
  // match).
  it('a digit-adjacent identifier tokenizes to its letter-only prefix, which is now skipped rather than flagged', async () => {
    const content = 'Run config2 now, not 42 times.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // Digit-ADJACENCY GUARD: WORD_RE still can never itself capture a digit,
  // but each match is now also checked against the (masked) segment text
  // immediately before its start and immediately after its end -- if
  // either neighbor is a digit, the match is a truncated fragment of a
  // digit-bearing identifier (not a standalone word) and is skipped. This
  // mitigates the false-positive class from common digit-bearing
  // identifiers: 'sha256' -> 'sha', 'utf8' -> 'utf', 'oauth2' -> 'oauth',
  // 'es6' -> 'es', and 'log4j' -> BOTH 'log' (digit after) and 'j' (digit
  // before) -- all skipped now instead of flagged as unknown words.
  it('does not flag letter-run fragments of common digit-bearing identifiers (sha256, utf8, oauth2, es6, log4j)', async () => {
    const content =
      'Hash it with sha256, encode as utf8, authenticate via oauth2, target es6, and log with log4j.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // Control: the digit-adjacency guard must only suppress fragments that
  // actually touch a digit -- a genuine, non-digit-adjacent misspelling
  // elsewhere in the very same sentence must still be flagged. Guards
  // that are too broad (e.g. accidentally skipping the whole segment, or
  // every token once ANY digit-adjacent token is seen) would silently
  // swallow this real finding.
  it('still flags a genuine standalone misspelling alongside digit-adjacent identifiers in the same sentence', async () => {
    const content = 'Using sha256 and utf8, this is a wrold of possibilities.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems.map((p) => p.match)).toEqual(['wrold']);
  });

  // Leading-digit case: the neighbor check must look BEFORE the match too,
  // not only after it -- a fragment like 'fast' in '2fast' has a digit
  // immediately preceding its start (not following its end), which is a
  // distinct code path from the trailing-digit cases above.
  it('does not flag a fragment with a leading digit neighbor (e.g. "2fast")', async () => {
    const content = 'This is 2fast for me.\n';
    const ctx = buildScopedContext(content, isProseScope);
    const rule = spellingRule('Unknown word "%s"%s', {});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // "can use the dev-dep dictionary-en files copied to a tmp dir as the
  // custom pair" -- dictionary-en's own default export already IS the raw
  // `{aff, dic}` byte content (see spelling.ts's `loadDictionary` doc
  // comment for its v4 export shape), so "copying" it just means writing
  // that same content out to a tmp `.aff`/`.dic` pair.
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
    // 'zzzzqqqqxxxx' is verified (via a real nspell + dictionary-en probe)
    // to have zero suggestions, so this also locks in the '' (empty
    // suffix) branch deterministically, without mocking the speller.
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

  // High-severity Bugbot finding: a missing/unreadable custom `dictionary`
  // path used to make `loadSpeller` reject, and `execute()` swallowed that
  // rejection and returned `[]` -- fail CLOSED, silently. A caller that
  // reaches execute() directly (bypassing validate()'s new dictionary-file
  // check below), or a TOCTOU where the file disappears between validate()
  // and this run, must instead fail LOUDLY: exactly one visible problem per
  // file, using runner.ts's existing internalError convention -- never zero
  // (silent) and never one-per-word (which would happen if the rejection
  // were caught per-word instead of once for the whole rule/file).
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

  // Layer 1 of the same finding: the module-level spellerCache stored the
  // in-flight promise BEFORE it settled and never evicted it on rejection,
  // so every later call for the same cache key replayed the same dead
  // rejection forever -- spelling silently disabled for the process
  // lifetime. A transient failure (file unreadable for a moment, then
  // readable) must instead retry cleanly on the next call.
  // A companion, spy-based test asserting the exact retry-attempt COUNT
  // lives in config/__tests__/spelling-peer-dependencies.test.ts (it mocks
  // 'node:fs/promises' itself, which that file's existing `vi.doMock`/fresh-
  // reimport infrastructure supports; a plain `vi.spyOn` on this file's
  // static `import * as fs from 'node:fs/promises'` cannot work here --
  // Vitest cannot redefine a real ESM namespace export). This test instead
  // proves the end-to-end, real-filesystem behavior: the dictionary files
  // are genuinely absent for the first call (real ENOENT, no mocking) and
  // genuinely present for the second.
  describe('speller cache eviction on rejected load', () => {
    it('evicts a rejected load: a later call with the same dictionary key retries once the files exist', async () => {
      const dictionaryEn = (await import('dictionary-en')).default;
      const dir = await makeTmpDir();
      const base = path.join(dir, 'custom');
      // Deliberately NOT writing the .aff/.dic files yet -- the first load
      // must reject with a real ENOENT.

      const content = 'This is a wrold of possibilities.\n';
      const ctx = buildScopedContext(content, isProseScope);
      const rule = spellingRule('Unknown word "%s"%s', { dictionary: base });

      // First call: the files don't exist -> execute() must surface the
      // failure (rethrow), not cache a silently-resolved `[]`.
      await expect(spelling.execute(rule, 'a.md', ctx)).rejects.toThrow();

      // The files now become available (simulating a transient failure
      // clearing). If the rejected promise were still cached under this
      // dictionary key, this second call would replay the SAME rejection
      // instead of retrying -- spelling would stay silently broken forever.
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

    // Bugbot finding, layer 2: validate() previously only checked that
    // `dictionary` was a non-empty STRING -- never that the `.aff`/`.dic`
    // files it names actually exist and are readable. A missing pair used
    // to pass validation cleanly and only fail (silently, per the finding)
    // the first time a file was linted.
    it('rejects a dictionary path whose .aff/.dic files do not exist, naming the resolved paths', async () => {
      const dir = await makeTmpDir();
      const base = path.join(dir, 'missing-custom');

      const result = await validate(spellingRuleConfig({ dictionary: base }));

      expect(result.isValid).toBe(false);
      const messages = result.errors.map((error) => error.message).join('\n');
      expect(messages).toContain(`${base}.aff`);
      expect(messages).toContain(`${base}.dic`);
    });

    // The resolution rule for a RELATIVE dictionary path must be identical
    // at validate() time and at execute()/runtime time (see
    // resolveDictionaryPaths, shared between spelling.ts and validate.ts) --
    // both resolve relative to process.cwd(), not the config file's
    // directory.
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

  // Task 8 (Phase 4): TECHNICAL_PROPER_NOUNS (src/data/proper-nouns.ts) is
  // unioned into the accepted-word set (alongside `vocab`) by default --
  // these prove the union and the `builtinVocabulary: false` opt-out that
  // restores strict pre-built-in behavior. Multi-token entries are split
  // into their individual word-level parts (see spelling.ts's
  // BUILTIN_VOCAB_WORDS) -- a per-word spell check has no way to accept a
  // whole phrase atomically the way `capitalization`'s phrase matching does.
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
