import { describe, it, expect } from 'vitest';

import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, CapitalizationAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { capitalization } from '../capitalization.js';
import { buildScopedContext, expectInvalidOptions, expectValidOptions } from './helpers.js';

// `fix` is optional on `ScopeRule`; this checks it exists so tests can call it.
function requireFix(): NonNullable<typeof capitalization.fix> {
  if (!capitalization.fix) throw new Error('expected capitalization.fix to be defined');
  return capitalization.fix;
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

const headingScope = (scope: string) => scope.startsWith('heading.');

describe('capitalization assertion', () => {
  it('reports the position and message of a heading that is not title-cased', async () => {
    const rule = capitalizationRule(MESSAGE, { match: '$title' });
    const ctx = buildScopedContext('## the great escape\n', headingScope);

    const problems = await capitalization.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(4); // '## ' is 3 chars, text starts at column 4
    expect(problems[0].message).toBe('"the great escape" should use $title capitalization.');
  });

  // `expected === input` means the heading is already correct: no problem and no fix.
  // Otherwise one problem is reported, --fix produces `expected`, and the fixed text lints clean.
  describe.each<[string, CapitalizationAssertion, [input: string, expected: string][]]>([
    [
      '$title',
      { match: '$title' },
      [
        ['## the great escape\n', '## The Great Escape\n'],
        ['## The Great Escape\n', '## The Great Escape\n'],
        ['## walking through the park\n', '## Walking Through the Park\n'], // AP is the default style
        ['## the `configFile` option\n', '## The `configFile` Option\n'],
        ['## the ``configFile`` option\n', '## The ``configFile`` Option\n'],
        ['## the ``configFile ` x`` option\n', '## The ``configFile ` x`` Option\n'],
        ['## the `code` and ``configFile`` option\n', '## The `code` and ``configFile`` Option\n'],
        ['## v2.0 migration guide\n', '## v2.0 Migration Guide\n'],
        ['## Upgrade to v2.0 today\n', '## Upgrade to v2.0 Today\n'],
        ['## x-codeSamples reference\n', '## x-codeSamples Reference\n'],
        ['## curl examples\n', '## curl Examples\n'],
      ],
    ],
    [
      '$title with style chicago',
      { match: '$title', style: 'chicago' },
      [['## walking through the park\n', '## Walking through the Park\n']],
    ],
    [
      '$title with exceptions',
      { match: '$title', exceptions: ['GitHub', 'e-commerce', 'Node.js', 'VS Code'] },
      [
        ['## the github docs\n', '## The GitHub Docs\n'],
        ['## the e-commerce platform\n', '## The e-commerce Platform\n'],
        ['## deploy with vs code today\n', '## Deploy With VS Code Today\n'],
        // A phrase exception counts as one word when deciding which word is first or last.
        ['## a guide to Node.js\n', '## A Guide to Node.js\n'],
        ['## Node.js and VS Code\n', '## Node.js and VS Code\n'],
        ['## to VS Code up\n', '## To VS Code Up\n'],
        ['## a guide to github\n', '## A Guide to GitHub\n'],
      ],
    ],
    [
      '$sentence',
      { match: '$sentence' },
      [
        ['## The Great Escape\n', '## The great escape\n'],
        ['## The great escape\n', '## The great escape\n'],
        ['## The `configFile` Option\n', '## The `configFile` option\n'],
        ['## the GitHub API guide\n', '## The GitHub API guide\n'], // an ALL-CAPS word keeps its casing
        // Text before the first sentence start does not restart the sentence.
        ['## Step 1. Configure the project\n', '## Step 1. Configure the project\n'],
        ['## 1. Configure the project\n', '## 1. Configure the project\n'],
        ['## Part one. Configure the project\n', '## Part one. Configure the project\n'],
        // An abbreviation or a colon does not end the sentence.
        ['## Cost vs. value\n', '## Cost vs. value\n'],
        ['## Monthly vs. annual schedules\n', '## Monthly vs. annual schedules\n'],
        ['## Pick a plan, e.g. the yearly one\n', '## Pick a plan, e.g. the yearly one\n'],
        ['## Use webhooks, i.e. server callbacks\n', '## Use webhooks, i.e. server callbacks\n'],
        [
          '## Retries, timeouts, etc. are configurable\n',
          '## Retries, timeouts, etc. are configurable\n',
        ],
        ['## Cost vs. Value\n', '## Cost vs. value\n'],
        ['## Example: sign-out button\n', '## Example: sign-out button\n'],
        ['## Example: Sign-out button\n', '## Example: sign-out button\n'],
        // A real sentence end restarts the sentence.
        ['## Step 1. configure the project\n', '## Step 1. Configure the project\n'],
        ['## Step 1. Configure The Whole Project\n', '## Step 1. Configure the whole project\n'],
        // A dot with no space after it does not end the sentence.
        ['## Call element.focus() on the node\n', '## Call element.focus() on the node\n'],
        ['## The v2.0 migration guide\n', '## The v2.0 migration guide\n'],
        // A leading code span is the first word.
        ['## `--rule` filtering\n', '## `--rule` filtering\n'],
        ['## `element.focus()` and the DOM\n', '## `element.focus()` and the DOM\n'],
        ['## `recheck run` options\n', '## `recheck run` options\n'],
        ['## `--rule` Filtering Findings\n', '## `--rule` filtering findings\n'],
        ['## `element.focus()`\n', '## `element.focus()`\n'],
        // Versions, vendor extensions and built-in vocabulary keep their casing.
        ['## v2.0 migration guide\n', '## v2.0 migration guide\n'],
        ['## v3 release notes\n', '## v3 release notes\n'],
        ['## Upgrade to v2.0 today\n', '## Upgrade to v2.0 today\n'],
        ['## vector3 math helpers\n', '## Vector3 math helpers\n'],
        ['## 2.0 migration guide\n', '## 2.0 migration guide\n'],
        ['## 2026 roadmap\n', '## 2026 roadmap\n'],
        ['## x-codeSamples reference\n', '## x-codeSamples reference\n'],
        ['## Use x-codeSamples here\n', '## Use x-codeSamples here\n'],
        ['## The x-metadata extension\n', '## The x-metadata extension\n'],
        ['## X-ray Imaging Basics\n', '## X-ray imaging basics\n'],
        ['## x- marks the spot\n', '## X- marks the spot\n'],
        ['## curl examples\n', '## curl examples\n'],
        ['## Send a request with curl\n', '## Send a request with curl\n'],
        ['# Deploy with OpenAPI today\n', '# Deploy with OpenAPI today\n'],
      ],
    ],
    [
      '$sentence with exceptions',
      { match: '$sentence', exceptions: ['e-commerce', 'Node.js', 'VS Code', 'GitHub'] },
      [
        ['## The E-Commerce Platform\n', '## The e-commerce platform\n'],
        ['# Install Node.js first\n', '# Install Node.js first\n'],
        ['# Install node.js first\n', '# Install Node.js first\n'],
        ['# Use node. js is fine\n', '# Use node. Js is fine\n'], // a phrase does not match across a sentence end
        ['## VS Code actions for teams\n', '## VS Code actions for teams\n'],
        ['## VS Code Actions for teams\n', '## VS Code actions for teams\n'],
        ['## A guide to github\n', '## A guide to GitHub\n'],
      ],
    ],
    [
      '$sentence with exceptions and the built-in vocabulary off',
      { match: '$sentence', exceptions: ['Acmesoft'], builtinVocabulary: false },
      [
        ['# Deploy with Acmesoft today\n', '# Deploy with Acmesoft today\n'],
        ['# Deploy with OpenAPI today\n', '# Deploy with openapi today\n'],
      ],
    ],
    [
      '$sentence with exceptions alongside the built-in vocabulary',
      { match: '$sentence', exceptions: ['Acmesoft'] },
      [
        [
          '# Deploy with OpenAPI and Acmesoft today\n',
          '# Deploy with OpenAPI and Acmesoft today\n',
        ],
      ],
    ],
    [
      '$lower',
      { match: '$lower' },
      [
        ['## The Great Escape\n', '## the great escape\n'],
        ['## the great escape\n', '## the great escape\n'],
        ['## The `configFile` Option\n', '## the `configFile` option\n'],
      ],
    ],
    [
      '$upper',
      { match: '$upper' },
      [
        ['## The Great Escape\n', '## THE GREAT ESCAPE\n'],
        ['## THE GREAT ESCAPE\n', '## THE GREAT ESCAPE\n'],
        ['## the `configFile` option\n', '## THE `configFile` OPTION\n'],
        ['## the ``configFile`` option\n', '## THE ``configFile`` OPTION\n'],
      ],
    ],
  ])('%s', (_label, options, rows) => {
    it.each(rows)('%j', async (input, expected) => {
      const rule = capitalizationRule(MESSAGE, options);
      const file = [{ path: 't.md', content: input }];

      const detected = await runRules(file, [rule]);
      expect(detected.problems).toHaveLength(expected === input ? 0 : 1);

      const fixed = await runRules(file, [rule], { fix: true });
      expect(fixed.fixedFiles.get('t.md') ?? input).toBe(expected);

      const relint = await runRules([{ path: 't.md', content: expected }], [rule]);
      expect(relint.problems).toEqual([]);
    });
  });

  it('skips a multi-line segment entirely -- neither a problem nor a fix, symmetric', async () => {
    // Two-line paragraph: skipped even though $title would rewrite it.
    const rule = capitalizationRule(MESSAGE, { match: '$title' }, 'paragraph');
    const ctx = buildScopedContext('the great\nescape story\n', (scope) => scope === 'paragraph');
    expect(ctx.segments).toHaveLength(1);
    expect(ctx.segments[0].startLine).not.toBe(ctx.segments[0].endLine);

    expect(await capitalization.execute(rule, 'test.md', ctx)).toEqual([]);
    expect(await requireFix()(rule, 'test.md', ctx)).toEqual([]);
  });

  it('reports but does NOT fix a segment whose case mapping is not length-preserving (ß -> SS)', async () => {
    // 'ß'.toUpperCase() is 'SS', which changes the text length, so the code span could not be put back.
    const content = '## the ß option `code`\n';
    const rule = capitalizationRule(MESSAGE, { match: '$upper' });

    const { problems, fixedFiles, fixes } = await runRules([{ path: 't.md', content }], [rule], {
      fix: true,
    });

    expect(problems).toHaveLength(1);
    expect(fixes).toEqual([]);
    expect(fixedFiles.size).toBe(0);
  });

  describe('custom regex match (detection-only)', () => {
    it('flags a segment failing the regex, with no fix even though the rule is fixable', async () => {
      const content = '## the great escape\n';
      const rule = capitalizationRule(MESSAGE, { match: '^[A-Z]' });
      const ctx = buildScopedContext(content, headingScope);

      const problems = await capitalization.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"the great escape" should use ^[A-Z] capitalization.');
      expect(await requireFix()(rule, 'test.md', ctx)).toEqual([]);

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.has('t.md')).toBe(false);
    });

    it.each([
      ['a segment satisfying the regex', '## The great escape\n', '^[A-Z]', headingScope, 0],
      ['an invalid regex, ignored instead of throwing', '## Some Heading\n', '[', headingScope, 0],
      [
        'a multi-line segment, unlike the $-styles',
        'the great\nescape story\n',
        '^[A-Z]',
        (scope: string) => scope === 'paragraph',
        1,
      ],
    ])('checks %s', async (_label, content, match, scopeFilter, expectedProblems) => {
      const rule = capitalizationRule(MESSAGE, { match });
      const ctx = buildScopedContext(content, scopeFilter);

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(expectedProblems);
    });
  });

  it('falls back to \'"%s" should use %s capitalization.\' when a programmatic rule has no message', async () => {
    const rule = capitalizationRule(undefined, { match: '$title' });

    const { problems } = await runRules(
      [{ path: 'test.md', content: '## the great escape\n' }],
      [rule]
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('"the great escape" should use $title capitalization.');
  });

  describe('validation', () => {
    it.each<[string, Record<string, unknown>]>([
      ['a minimal config', { match: '$title' }],
      [
        'style alongside a non-$title match (a documented no-op)',
        { match: '$lower', style: 'chicago' },
      ],
      ['builtinVocabulary: true', { match: '$title', builtinVocabulary: true }],
      ['builtinVocabulary: false', { match: '$title', builtinVocabulary: false }],
    ])('accepts %s', async (_label, options) => {
      await expectValidOptions('capitalization', options);
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['a missing match', {}, 'match'],
      ['an empty-string match', { match: '' }, 'match'],
      ['an invalid style', { match: '$title', style: 'mla' }, 'style'],
      ['a non-array exceptions', { match: '$title', exceptions: 'GitHub' }, 'exceptions'],
      [
        'an exceptions array containing an empty string',
        { match: '$title', exceptions: ['GitHub', ''] },
        'exceptions',
      ],
      ['an unknown option', { match: '$title', unknownOption: true }, 'unknownOption'],
      [
        'a non-boolean builtinVocabulary',
        { match: '$title', builtinVocabulary: 'yes' },
        'builtinVocabulary',
      ],
    ])('rejects %s', async (_label, options, mention) => {
      await expectInvalidOptions('capitalization', options, mention);
    });
  });

  // With `markdoc: true`, tags are blanked out of the checked text but the report uses the original source text.
  describe('markdoc-masked segments', () => {
    function maskedContext(content: string): ScopeRuleContext {
      const tree = parseMarkdown(content, { markdoc: true });
      const segments = extractScopes(tree, content).filter((s) => s.scope === 'heading.h1');
      return { segments, content, tree };
    }

    it('quotes the tag verbatim in match/text/message, never the mask', async () => {
      const ctx = maskedContext('# the {% partial file="x" /%} guide\n');
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
      const ctx = maskedContext('# The {% partial file="x" /%} Guide\n');
      const problems = await capitalization.execute(
        capitalizationRule('bad: %s (%s)', { match: '$title' }),
        'test.md',
        ctx
      );
      expect(problems).toEqual([]);
    });

    it('proposes a length-preserving fix, which is what lets the tag be restored', async () => {
      const ctx = maskedContext('# the {% partial file="x" /%} guide\n');
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
