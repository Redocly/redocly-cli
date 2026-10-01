import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules, runRulesUntilStable } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { repetition } from '../repetition.js';
import { buildWholeFileContext } from './helpers.js';

function repetitionRule(
  message: string,
  options: { pattern?: string; ignoreCase?: boolean } = {},
  scope = 'all'
): NormalizedRule {
  return {
    name: 'test-repetition',
    shortName: 'repetition',
    severity: 'error',
    message,
    scope,
    assertions: { repetition: options },
  };
}

// Builds a rule context with only the segments whose scope matches the filter.
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

describe('repetition assertion', () => {
  it('flags a same-line adjacent repeat, problem at the SECOND token', async () => {
    const content = 'the the\n';
    const rule = repetitionRule('Repeated word "%s".');
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('Repeated word "the".');
    expect(problems[0].line).toBe(1);
    // 'the the': second 'the' starts at source column 5.
    expect(problems[0].column).toBe(5);
    // `text` is the whole line; `match` is the repeated token.
    expect(problems[0].text).toBe('the the');
    expect(problems[0].match).toBe('the');
  });

  it('fixes a same-line repeat by collapsing to one occurrence', async () => {
    const content = 'the the\n';
    const rule = repetitionRule('Repeated word "%s".');

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

    expect(fixedFiles.get('t.md')).toBe('the\n');
  });

  it('flags "The the" under the default ignoreCase:true, and fix keeps the FIRST token\'s casing', async () => {
    const content = 'The the\n';
    const rule = repetitionRule('Repeated word "%s".');
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);
    expect(problems).toHaveLength(1);

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
    // The fix keeps the first token as written ('The', not 'the').
    expect(fixedFiles.get('t.md')).toBe('The\n');
  });

  it('does not flag "The the" when ignoreCase is explicitly false', async () => {
    const content = 'The the\n';
    const rule = repetitionRule('Repeated word "%s".', { ignoreCase: false });
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('flags a hard-wrapped repeat across a line break and fixes line 2 down to the remainder', async () => {
    const content = 'the\nthe rest\n';
    const rule = repetitionRule('Repeated word "%s".');
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    // Reported at the second token's position.
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
    expect(problems[0].text).toBe('the rest');
    expect(problems[0].match).toBe('the');

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
    expect(fixedFiles.get('t.md')).toBe('the\nrest\n');
  });

  it('deletes the whole line when the duplicate token is ALONE on its line (no empty line left)', async () => {
    // Deleting the token and the whitespace after it would leave an empty line, so a token alone on its line is removed with the whole line.
    const content = 'the\nthe\nrest\n';
    const rule = repetitionRule('Repeated word "%s".');

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
    expect(fixedFiles.get('t.md')).toBe('the\nrest\n');
  });

  it('lone-token whole-line deletion is idempotent under runRulesUntilStable', async () => {
    const content = 'the\nthe\nrest\n';
    const rule = repetitionRule('Repeated word "%s".');

    const { fixedFiles, skippedFixes } = await runRulesUntilStable(
      [{ path: 't.md', content }],
      [rule]
    );
    expect(fixedFiles.get('t.md')).toBe('the\nrest\n');
    expect(skippedFixes).toEqual([]);

    const second = await runRulesUntilStable([{ path: 't.md', content: 'the\nrest\n' }], [rule]);
    expect(second.fixedFiles.size).toBe(0);
  });

  it('does not flag "the theory" -- token boundaries, not substring matching', async () => {
    const content = 'the theory\n';
    const rule = repetitionRule('Repeated word "%s".');
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  describe('adjacency requires AT MOST ONE line break in the gap (regression guard)', () => {
    // With scope 'all' the whole file is one segment. The last word of one paragraph and the first word of the next must not count as a repeat, or --fix would delete text across the paragraph break.
    it('does not flag across a blank line, and --fix makes zero fixes (document-corruption regression lock)', async () => {
      const content = 'This paragraph ends with word\n\nWord starts the next paragraph\n';
      const rule = repetitionRule('Repeated word "%s".');
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);

      const { fixedFiles, fixes } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toEqual([]);
      expect(fixedFiles.has('t.md')).toBe(false);
    });

    it('does not flag across a CRLF blank line -- "\\r\\n\\r\\n" is TWO line breaks, not one', async () => {
      const content = 'word\r\n\r\nWord\r\n';
      const rule = repetitionRule('Repeated word "%s".');
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);

      // No false pair, so no fix either.
      const { fixes, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toEqual([]);
      expect(fixedFiles.has('t.md')).toBe(false);
    });

    it('still flags across a single CRLF hard-wrap -- "\\r\\n" is ONE line break, so tokens stay adjacent', async () => {
      const content = 'word\r\nword rest\r\n';
      const rule = repetitionRule('Repeated word "%s".');
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Repeated word "word".');

      // Only the second token's line is changed and CRLF line endings are kept.
      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('word\r\nrest\r\n');
    });
  });

  it("scope: paragraph -- both paragraphs' internal repeats are flagged, but the cross-paragraph boundary pair is not (segments isolate it naturally)", async () => {
    // 'word.' and 'Word' are in different paragraphs, so with scope 'paragraph' they are never compared.
    const content =
      'This sentence has has an internal repeat word.\n\nWord starts second paragraph paragraph.\n';
    const rule = repetitionRule('Repeated word "%s".', {}, 'paragraph');
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.message)).toEqual([
      'Repeated word "has".',
      'Repeated word "paragraph".',
    ]);
  });

  describe('custom `pattern` option restricts tokenization', () => {
    it('the default \\w+ pattern flags a repeated digit token', async () => {
      const content = '1 1\n';
      const rule = repetitionRule('Repeated word "%s".');
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Repeated word "1".');
    });

    it('pattern: "[A-Za-z]+" ignores digit tokens entirely, so the same content is not flagged', async () => {
      const content = '1 1\n';
      const rule = repetitionRule('Repeated word "%s".', { pattern: '[A-Za-z]+' });
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  it('scope: sentence -- a repeat inside one sentence is flagged; a word shared across a sentence boundary is not', async () => {
    // 'again. Again' crosses two sentences, so it is not compared. Only 'has has' is flagged.
    const content = 'This sentence has has a repeat again. Again nothing repeats here.\n';
    const rule = repetitionRule('Repeated word "%s".', {}, 'sentence');
    const ctx = buildScopedContext(content, (scope) => scope === 'sentence');
    expect(ctx.segments.length).toBeGreaterThanOrEqual(2);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('Repeated word "has".');
    expect(problems[0].line).toBe(1);
    // 'This sentence has has ...': the second 'has' starts at column 19.
    expect(problems[0].column).toBe(19);
  });

  it("reports the true column for a repeat on a heading segment's first line", async () => {
    // A heading's content starts after the '## ', so the column needs the segment's start column.
    const content = '## the the\n';
    const rule = repetitionRule('Repeated word "%s".');

    const tree = parseMarkdown(content);
    const segments = extractScopes(tree, content).filter((s) => s.scope === 'heading.h2');
    const ctx: ScopeRuleContext = { segments, content, tree };

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // '## the the': second 'the' starts at source column 8.
    expect(problems[0].column).toBe(8);
  });

  // A pattern that can match an empty string (like `\w*`) must not produce empty tokens, or two empty tokens would count as a repeated word.
  describe('zero-width-capable custom `pattern` (defense against phantom empty-token repeats)', () => {
    it('reports zero problems for a zero-width-capable pattern with no real repeat', async () => {
      const content = 'foo   bar\n';
      const rule = repetitionRule('Repeated word "%s".', { pattern: '\\w*' });
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('still flags a genuine repeat alongside zero-width-capable positions', async () => {
      const content = 'foo   foo\n';
      const rule = repetitionRule('Repeated word "%s".', { pattern: '\\w*' });
      const ctx = buildWholeFileContext(content);

      const problems = await repetition.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Repeated word "foo".');
    });
  });

  it('is idempotent under runRulesUntilStable: "the the the" converges to "the"', async () => {
    const content = 'the the the\n';
    const rule = repetitionRule('Repeated word "%s".');

    const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);

    expect(fixedFiles.get('t.md')).toBe('the\n');
  });

  it('ignores an invalid regex pattern instead of throwing', async () => {
    const content = 'the the\n';
    const rule = repetitionRule('Repeated word "%s".', { pattern: '[' });
    const ctx = buildWholeFileContext(content);

    const problems = await repetition.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // The fallback message must have one `%s` for each value, and the rule has no `message`.
  describe('no-message fallback (programmatic NormalizedRule, bypassing validate())', () => {
    it("falls back to 'Repeated word \"%s\".' with the second token's text", async () => {
      const content = 'the the\n';
      const rule: NormalizedRule = {
        name: 'test-repetition-fallback',
        shortName: 'repetition',
        severity: 'error',
        scope: 'all',
        assertions: { repetition: {} },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Repeated word "the".');
    });
  });

  describe('validation', () => {
    function repetitionConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { repetition: options },
        },
      };
    }

    it('accepts an empty options object -- both pattern and ignoreCase are optional', async () => {
      const result = await validate(repetitionConfig({}));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an unknown repetition option', async () => {
      const result = await validate(repetitionConfig({ unknownOption: true }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('rejects a non-string pattern', async () => {
      const result = await validate(repetitionConfig({ pattern: 42 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pattern'))).toBe(true);
    });

    // An empty pattern matches everywhere, so it is rejected.
    it('rejects an empty-string pattern when provided', async () => {
      const result = await validate(repetitionConfig({ pattern: '' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pattern'))).toBe(true);
    });

    it('rejects a non-boolean ignoreCase', async () => {
      const result = await validate(repetitionConfig({ ignoreCase: 'yes' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignoreCase'))).toBe(true);
    });
  });
});
