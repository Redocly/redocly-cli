import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules, runRulesUntilStable } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, CapitalizationAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { capitalization } from '../capitalization.js';

// `fix` is optional on `ScopeRule`; this checks it exists so tests can call it.
function requireFix(): NonNullable<typeof capitalization.fix> {
  if (!capitalization.fix) throw new Error('expected capitalization.fix to be defined');
  return capitalization.fix;
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

function capitalizationRule(
  message: string | undefined,
  options: CapitalizationAssertion,
  scope: string | string[] = 'heading'
): NormalizedRule {
  return {
    name: 'test-capitalization',
    shortName: 'capitalization',
    severity: 'error',
    message,
    scope,
    assertions: { capitalization: options },
  };
}

const MESSAGE = '"%s" should use %s capitalization.';

describe('capitalization assertion', () => {
  describe('$title', () => {
    it('flags a heading that is not title-cased', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(1);
      expect(problems[0].column).toBe(4); // '## ' is 3 chars, text starts at column 4
      expect(problems[0].message).toBe('"the great escape" should use $title capitalization.');
    });

    it('does not flag an already title-cased heading', async () => {
      const content = '## The Great Escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('fix rewrites the heading text in place', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' }, 'heading');

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      expect(fixedFiles.get('t.md')).toBe('## The Great Escape\n');
    });

    it('is idempotent under runRulesUntilStable', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' }, 'heading');

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const converged = fixedFiles.get('t.md') ?? content;
      expect(converged).toBe('## The Great Escape\n');

      const relint = await runRules([{ path: 't.md', content: converged }], [rule]);
      expect(relint.problems).toEqual([]);
    });

    it('defaults to AP style when style is omitted', async () => {
      const content = '## walking through the park\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      // AP capitalizes 'Through' (7 letters, not a short preposition).
      expect(fixedFiles.get('t.md')).toBe('## Walking Through the Park\n');
    });

    it('lowercases a long preposition mid-title under Chicago style, unlike AP', async () => {
      const content = '## walking through the park\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', style: 'chicago' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      expect(fixedFiles.get('t.md')).toBe('## Walking through the Park\n');
    });

    it('keeps an exception word exactly as written through fix, even at a non-edge position', async () => {
      const content = '## the github docs\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', exceptions: ['GitHub'] });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      expect(fixedFiles.get('t.md')).toBe('## The GitHub Docs\n');
    });

    it('freezes a backtick-delimited code span -- its content is neither flagged nor rewritten', async () => {
      const content = '## the `configFile` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      // `configFile` keeps its casing.
      expect(fixedFiles.get('t.md')).toBe('## The `configFile` Option\n');
    });

    it('skips a multi-line segment entirely -- neither a problem nor a fix, symmetric', async () => {
      // Two-line paragraph: skipped even though $title would rewrite it.
      const content = 'the great\nescape story\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' }, 'paragraph');
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
      expect(ctx.segments).toHaveLength(1);
      expect(ctx.segments[0].startLine).not.toBe(ctx.segments[0].endLine);

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);

      const fixes = await requireFix()(rule, 'test.md', ctx);
      expect(fixes).toEqual([]);
    });
  });

  // Multi-backtick spans (``code``) must be protected like single ones.
  describe('multi-backtick code spans', () => {
    it('$title freezes a double-backtick span -- inner camelCase survives, surrounding words are title-cased', async () => {
      const content = '## the ``configFile`` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The ``configFile`` Option\n');
    });

    it('$upper freezes a double-backtick span the same way', async () => {
      const content = '## the ``configFile`` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$upper' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## THE ``configFile`` OPTION\n');
    });

    it('freezes a double-backtick span whose content itself contains a literal backtick -- the motivating CommonMark case', async () => {
      // ``configFile ` x`` is one code span even though it contains a single backtick.
      const content = '## the ``configFile ` x`` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The ``configFile ` x`` Option\n');
    });

    it('regression lock: a single-backtick span alongside a double-backtick span both freeze correctly', async () => {
      const content = '## the `code` and ``configFile`` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The `code` and ``configFile`` Option\n');
    });
  });

  describe('$sentence', () => {
    it('capitalizes only the first word, lowercasing the rest', async () => {
      const content = '## The Great Escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The great escape\n');
    });

    it('does not flag an already sentence-cased heading', async () => {
      const content = '## The great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });

    it('leaves an exception word and an ALL-CAPS word alone mid-sentence', async () => {
      // 'GitHub' (exception) and 'API' (all caps) must stay as written.
      const content = '## the GitHub API guide\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['GitHub'] });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The GitHub API guide\n');
    });

    it('freezes a backtick-delimited code span -- its content is neither flagged nor rewritten', async () => {
      // Mirrors the $title test: `configFile` in backticks stays as written.
      const content = '## The `configFile` Option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The `configFile` option\n');
    });
  });

  describe('$sentence sentence-initial position', () => {
    // A prefix like '1.' must not make the next word lowercase.
    it.each([
      ['## Step 1. Configure the project\n', 'a "Step N." prefix'],
      ['## 1. Configure the project\n', 'a bare ordinal prefix'],
      ['## Part one. Configure the project\n', 'a spelled-out ordinal'],
    ])('does not flag %s (%s)', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    // A colon does not start a new sentence. Style guides say to lowercase after a colon unless a full sentence follows.
    it.each([
      ['## Cost vs. value\n', 'vs.'],
      ['## Monthly vs. annual schedules\n', 'vs. mid-heading'],
      ['## Pick a plan, e.g. the yearly one\n', 'e.g.'],
      ['## Use webhooks, i.e. server callbacks\n', 'i.e.'],
      ['## Retries, timeouts, etc. are configurable\n', 'etc.'],
    ])('does not restart the sentence after %s (%s)', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('still lowercases a capitalized word after an abbreviation', async () => {
      const content = '## Cost vs. Value\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Cost vs. value\n');
    });

    it('leaves the word after a colon lowercase', async () => {
      const content = '## Example: sign-out button\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('still lowercases a capitalized word after a colon', async () => {
      const content = '## Example: Sign-out button\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Example: sign-out button\n');
    });

    it('still capitalizes the opening word of a later sentence when the author did not', async () => {
      const content = '## Step 1. configure the project\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Step 1. Configure the project\n');
    });

    it('still lowercases the words after a restarted sentence', async () => {
      const content = '## Step 1. Configure The Whole Project\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Step 1. Configure the whole project\n');
    });

    // A dot with no space is not a sentence end.
    it.each([
      ['## Call element.focus() on the node\n', 'a dotted method reference'],
      ['## The v2.0 migration guide\n', 'a version number'],
    ])('does not restart the sentence inside %s (%s)', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    // A code span at the start must not make the next word capitalized.
    it.each([
      ['## `--rule` filtering\n', 'a leading code span'],
      ['## `element.focus()` and the DOM\n', 'a leading code span with a dotted call'],
      ['## `recheck run` options\n', 'a leading multi-word code span'],
    ])('does not flag %s (%s)', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('still lowercases the rest of a heading that opens with a code span', async () => {
      const content = '## `--rule` Filtering Findings\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## `--rule` filtering findings\n');
    });

    it('a heading that is only a code span is left alone', async () => {
      const content = '## `element.focus()`\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });
  });

  describe('leading version tokens', () => {
    it.each([
      ['## v2.0 migration guide\n', '$sentence'],
      ['## v3 release notes\n', '$sentence'],
    ])('$sentence does not capitalize the v of %s', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('$title does not capitalize the v either', async () => {
      const content = '## v2.0 migration guide\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## v2.0 Migration Guide\n');
    });

    it('leaves a version alone mid-heading too, under both styles', async () => {
      const content = '## Upgrade to v2.0 today\n';
      for (const match of ['$sentence', '$title'] as const) {
        const rule = capitalizationRule(MESSAGE, { match });
        const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
        expect(fixedFiles.get('t.md') ?? content).toContain('v2.0');
      }
    });

    it('still capitalizes an ordinary word that starts with v and holds a digit', async () => {
      const content = '## vector3 math helpers\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Vector3 math helpers\n');
    });

    it.each([['## 2.0 migration guide\n'], ['## 2026 roadmap\n']])(
      'leaves %s alone, as it already did',
      async (content) => {
        const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
        const { problems } = await runRules([{ path: 't.md', content }], [rule]);
        expect(problems).toEqual([]);
      }
    );
  });

  describe('vendor extension tokens', () => {
    it.each([
      ['## x-codeSamples reference\n', 'at the front'],
      ['## Use x-codeSamples here\n', 'mid-heading'],
      ['## The x-metadata extension\n', 'a lowercase extension mid-heading'],
    ])('$sentence leaves %s untouched (%s)', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('$title leaves it untouched too, hyphen and camel hump intact', async () => {
      const content = '## x-codeSamples reference\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## x-codeSamples Reference\n');
    });

    it('does not treat a capitalized X- word as an extension', async () => {
      const content = '## X-ray Imaging Basics\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## X-ray imaging basics\n');
    });

    it('a bare "x-" with nothing after it is not an extension', async () => {
      const content = '## x- marks the spot\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## X- marks the spot\n');
    });
  });

  describe('curl in the built-in vocabulary', () => {
    it.each([
      ['## curl examples\n', '$sentence'],
      ['## Send a request with curl\n', '$sentence'],
    ])('is not capitalized in %s under %s', async (content) => {
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });
      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);
    });

    it('survives $title as well', async () => {
      const content = '## curl examples\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## curl Examples\n');
    });
  });

  // $title must honor a whole-word exception like 'e-commerce', as $sentence does.
  describe('$title and $sentence agree on a whole-compound exception', () => {
    it('$title preserves the compound as-written via fix', async () => {
      const content = '## the e-commerce platform\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', exceptions: ['e-commerce'] });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The e-commerce Platform\n');
    });

    it('$sentence preserves the same compound as-written via fix', async () => {
      const content = '## The E-Commerce Platform\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['e-commerce'] });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## The e-commerce platform\n');
    });
  });

  // A dotted exception like 'Node.js' must be protected under $sentence and $title alike.
  describe('phrase (multi-word / dotted) exceptions', () => {
    it('preserves an already-as-written dotted exception under $sentence', async () => {
      const content = '# Install Node.js first\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['Node.js'] });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });

    // A phrase exception is restored to its written form, like a single-word exception.
    it('enforces the as-written casing of a mismatched-case dotted exception under $sentence, like a single-word exception', async () => {
      const content = '# Install node.js first\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['Node.js'] });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('# Install Node.js first\n');
    });

    it('does not match a phrase across a sentence boundary', async () => {
      // 'node. js' with a space is not a match for 'Node.js', so 'js' is just the first word of a new sentence.
      const content = '# Use node. js is fine\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['Node.js'] });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('# Use node. Js is fine\n');
    });

    it('preserves a multi-word exception under $title via fix, scoped through the full rule', async () => {
      const content = '## deploy with vs code today\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', exceptions: ['VS Code'] });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## Deploy With VS Code Today\n');
    });
  });

  // A phrase exception counts as one word when deciding which word is first or last.
  describe('phrase exceptions and word position (#25610)', () => {
    it('$sentence does not flag a heading opening with a phrase followed by correct lowercase prose', async () => {
      const content = '## VS Code actions for teams\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['VS Code'] });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);

      // --fix must change nothing, even on a second pass.
      const first = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(first.fixedFiles.has('t.md')).toBe(false);
      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      expect(fixedFiles.get('t.md') ?? content).toBe(content);
    });

    it('$sentence still flags a genuinely wrong capital after a leading phrase, and fixes only that', async () => {
      // 'Actions' is still wrong and must be fixed; 'VS Code' keeps its casing.
      const content = '## VS Code Actions for teams\n';
      const rule = capitalizationRule(MESSAGE, { match: '$sentence', exceptions: ['VS Code'] });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const converged = fixedFiles.get('t.md') ?? content;
      expect(converged).toBe('## VS Code actions for teams\n');
      const relint = await runRules([{ path: 't.md', content: converged }], [rule]);
      expect(relint.problems).toEqual([]);
    });

    it('$title (AP) handles the real last word when the phrase is LAST, keeping the phrase as-written', async () => {
      const content = '## a guide to Node.js\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', exceptions: ['Node.js'] });

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const converged = fixedFiles.get('t.md') ?? content;
      expect(converged).toBe('## A Guide to Node.js\n');
      const relint = await runRules([{ path: 't.md', content: converged }], [rule]);
      expect(relint.problems).toEqual([]);
    });

    it('$title (AP) handles a phrase that is both FIRST and LAST', async () => {
      const content = '## Node.js and VS Code\n';
      const rule = capitalizationRule(MESSAGE, {
        match: '$title',
        exceptions: ['Node.js', 'VS Code'],
      });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toEqual([]);

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      expect(fixedFiles.get('t.md') ?? content).toBe(content);
    });

    it('$title (AP) still corrects both the first and last word around a MIDDLE phrase', async () => {
      // Words around a phrase in the middle are still checked as first and last.
      const content = '## to VS Code up\n';
      const rule = capitalizationRule(MESSAGE, { match: '$title', exceptions: ['VS Code'] });

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const converged = fixedFiles.get('t.md') ?? content;
      expect(converged).toBe('## To VS Code Up\n');
      const relint = await runRules([{ path: 't.md', content: converged }], [rule]);
      expect(relint.problems).toEqual([]);
    });

    it('leaves single-word exceptions unaffected -- they resolve by lookup, not position', async () => {
      // No phrase exceptions, only single-word ones.
      for (const [match, content, expected] of [
        ['$title', '## a guide to github\n', '## A Guide to GitHub\n'],
        ['$sentence', '## A guide to github\n', '## A guide to GitHub\n'],
      ] as [string, string, string][]) {
        const rule = capitalizationRule(MESSAGE, { match, exceptions: ['GitHub'] });
        const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
        expect(fixedFiles.get('t.md') ?? content).toBe(expected);
      }
    });
  });

  describe('$lower', () => {
    it('flags and fixes a heading that is not all-lowercase', async () => {
      const content = '## The Great Escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$lower' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## the great escape\n');
    });

    it('does not flag an already-lowercase heading', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$lower' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });

    it('freezes a backtick-delimited code span -- its content is neither flagged nor rewritten', async () => {
      // Mirrors the $title test: `configFile` in backticks stays as written.
      const content = '## The `configFile` Option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$lower' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## the `configFile` option\n');
    });
  });

  describe('$upper', () => {
    it('flags and fixes a heading that is not all-uppercase', async () => {
      const content = '## The Great Escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '$upper' });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## THE GREAT ESCAPE\n');
    });

    it('does not flag an already-uppercase heading', async () => {
      const content = '## THE GREAT ESCAPE\n';
      const rule = capitalizationRule(MESSAGE, { match: '$upper' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });

    it('freezes a backtick-delimited code span -- its content is neither flagged nor rewritten', async () => {
      // Mirrors the $title test: `configFile` in backticks stays as written.
      const content = '## the `configFile` option\n';
      const rule = capitalizationRule(MESSAGE, { match: '$upper' });

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(1);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('## THE `configFile` OPTION\n');
    });

    it('reports but does NOT fix a segment whose case mapping is not length-preserving (ß -> SS)', async () => {
      // 'ß'.toUpperCase() is 'SS', which changes the text length. The problem is still reported, but without a fix, and the code span stays as written.
      const content = '## the ß option `code`\n';
      const rule = capitalizationRule(MESSAGE, { match: '$upper' });

      const { problems, fixedFiles, fixes } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });

      expect(problems).toHaveLength(1);
      expect(fixes).toEqual([]);
      expect(fixedFiles.size).toBe(0);
    });
  });

  describe('custom regex match (detection-only)', () => {
    it('flags a segment failing the regex, with no fix even though the rule is fixable', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '^[A-Z]' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"the great escape" should use ^[A-Z] capitalization.');

      const fixes = await requireFix()(rule, 'test.md', ctx);
      expect(fixes).toEqual([]);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.has('t.md')).toBe(false);
    });

    it('does not flag a segment satisfying the regex', async () => {
      const content = '## The great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '^[A-Z]' });
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });

    it('still checks (and reports) a multi-line segment -- unlike the four $-styles', async () => {
      const content = 'the great\nescape story\n';
      const rule = capitalizationRule(MESSAGE, { match: '^[A-Z]' }, 'paragraph');
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('ignores an invalid regex instead of throwing', async () => {
      const rule = capitalizationRule(MESSAGE, { match: '[' });
      const ctx = buildScopedContext('## Some Heading\n', (scope) => scope.startsWith('heading.'));

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toEqual([]);
    });
  });

  describe('fallback message (programmatic NormalizedRule, bypassing validate())', () => {
    it('falls back to \'"%s" should use %s capitalization.\' with segment text then the match value', async () => {
      const content = '## the great escape\n';
      const rule: NormalizedRule = {
        name: 'test-capitalization-fallback',
        shortName: 'capitalization',
        severity: 'error',
        scope: 'heading',
        assertions: { capitalization: { match: '$title' } },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"the great escape" should use $title capitalization.');
    });
  });

  describe('validation', () => {
    function capitalizationConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { capitalization: options },
        },
      };
    }

    it('accepts a minimal valid config', async () => {
      const result = await validate(capitalizationConfig({ match: '$title' }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects a missing match', async () => {
      const result = await validate(capitalizationConfig({}));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('match'))).toBe(true);
    });

    it('rejects an empty-string match', async () => {
      const result = await validate(capitalizationConfig({ match: '' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('match'))).toBe(true);
    });

    it('rejects an invalid style', async () => {
      const result = await validate(capitalizationConfig({ match: '$title', style: 'mla' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('style'))).toBe(true);
    });

    it('accepts style alongside a non-$title match (documented no-op, not an error)', async () => {
      const result = await validate(capitalizationConfig({ match: '$lower', style: 'chicago' }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects a non-array exceptions', async () => {
      const result = await validate(
        capitalizationConfig({ match: '$title', exceptions: 'GitHub' })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('exceptions'))).toBe(true);
    });

    it('rejects an exceptions array containing an empty string', async () => {
      const result = await validate(
        capitalizationConfig({ match: '$title', exceptions: ['GitHub', ''] })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('exceptions'))).toBe(true);
    });

    it('rejects an unknown capitalization option', async () => {
      const result = await validate(capitalizationConfig({ match: '$title', unknownOption: true }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('accepts builtinVocabulary: true/false', async () => {
      const trueResult = await validate(
        capitalizationConfig({ match: '$title', builtinVocabulary: true })
      );
      expect(trueResult.isValid).toBe(true);
      expect(trueResult.errors).toEqual([]);

      const falseResult = await validate(
        capitalizationConfig({ match: '$title', builtinVocabulary: false })
      );
      expect(falseResult.isValid).toBe(true);
      expect(falseResult.errors).toEqual([]);
    });

    it('rejects a non-boolean builtinVocabulary', async () => {
      const result = await validate(
        capitalizationConfig({ match: '$title', builtinVocabulary: 'yes' })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('builtinVocabulary'))).toBe(true);
    });
  });

  describe('built-in technical proper-noun vocabulary', () => {
    it('protects a built-in noun under $sentence with no exceptions configured', async () => {
      const content = '# Deploy with OpenAPI today\n';
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule(MESSAGE, { match: '$sentence' });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('composes the built-ins with the rule’s own exceptions rather than replacing them', async () => {
      const content = '# Deploy with OpenAPI and Acmesoft today\n';
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule(MESSAGE, {
        match: '$sentence',
        exceptions: ['Acmesoft'],
      });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('builtinVocabulary: false restores strict behavior: an unlisted built-in noun IS flagged', async () => {
      const content = '# Deploy with OpenAPI today\n';
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule(MESSAGE, {
        match: '$sentence',
        builtinVocabulary: false,
      });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
    });

    it('builtinVocabulary: false still honors the rule’s own exceptions', async () => {
      const content = '# Deploy with Acmesoft today\n';
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule(MESSAGE, {
        match: '$sentence',
        exceptions: ['Acmesoft'],
        builtinVocabulary: false,
      });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });
  // With `markdoc: true`, tags are blanked out of the checked text but the report uses the original source text.
  describe('markdoc-masked segments', () => {
    function maskedContext(content: string, scope: string): ScopeRuleContext {
      const tree = parseMarkdown(content, { markdoc: true });
      const segments = extractScopes(tree, content).filter((s) => s.scope === scope);
      return { segments, content, tree };
    }

    it('quotes the tag verbatim in match/text/message, never the mask', async () => {
      const ctx = maskedContext('# the {% partial file="x" /%} guide\n', 'heading.h1');
      expect(ctx.segments[0].content).not.toContain('{%');
      expect(ctx.segments[0].sourceText).toContain('{%');

      const problems = await capitalization.execute(
        capitalizationRule('bad: %s (%s)', { match: '$title' }),
        'test.md',
        ctx
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('the {% partial file="x" /%} guide');
      expect(problems[0].text).toBe('the {% partial file="x" /%} guide');
      expect(problems[0].message).toContain('{% partial file="x" /%}');
    });

    it('does not let the tag text influence the casing decision', async () => {
      // 'partial' and 'file' are inside the tag, so the lowercase words must not be flagged.
      const ctx = maskedContext('# The {% partial file="x" /%} Guide\n', 'heading.h1');
      const problems = await capitalization.execute(
        capitalizationRule('bad: %s (%s)', { match: '$title' }),
        'test.md',
        ctx
      );
      expect(problems).toEqual([]);
    });

    it('proposes a length-preserving fix, which is what lets the tag be restored', async () => {
      const ctx = maskedContext('# the {% partial file="x" /%} guide\n', 'heading.h1');
      const fixes = await requireFix()(
        capitalizationRule('bad: %s (%s)', { match: '$title' }),
        'test.md',
        ctx
      );
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toHaveLength(fixes[0].deleteCount ?? -1);
    });
  });
});
