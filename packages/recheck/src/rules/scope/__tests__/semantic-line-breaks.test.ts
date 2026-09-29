import { describe, it, expect } from 'vitest';

import { applyFixesToContent } from '../../../core/auto-fix.js';
import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';
import { semanticLineBreaks } from '../semantic-line-breaks.js';
import { buildWholeFileContext } from './helpers.js';

const id = 'semantic-line-breaks';

function createTestRule(options: { [key: string]: any }, scope = 'all'): NormalizedRule {
  return {
    name: `recheck/${id}`,
    shortName: id,
    severity: 'error',
    message: 'Use semantic line breaks (%s mode).',
    link: '',
    scope,
    assertions: { [id]: options },
  };
}

async function lintAndFix(content: string, options: { [key: string]: any }) {
  const rule = createTestRule(options);
  const ctx = buildWholeFileContext(content);
  const problems = await semanticLineBreaks.execute(rule, 'test.md', ctx);
  const fixes = (await semanticLineBreaks.fix?.(rule, 'test.md', ctx)) ?? [];
  return { problems, fixed: applyFixesToContent(content, fixes).content };
}

const sentence = { mode: 'sentence' };

describe('semantic-line-breaks assertion', () => {
  // `expected` is the --fix output. A `null` row is not flagged and --fix leaves it byte-identical.
  // Every flagged row must produce exactly one problem, and the fixed output must lint clean with no further fixes.
  describe.each<[string, { [key: string]: any }, [content: string, expected: string | null][]]>([
    [
      'sentence mode',
      sentence,
      [
        ['First sentence. Second sentence.', 'First sentence.\nSecond sentence.'],
        [
          'First sentence. Second sentence. Third sentence.',
          'First sentence.\nSecond sentence.\nThird sentence.',
        ],
        // links, code spans and quotes
        ['Check out [this link](http://example.com).', null],
        [
          'Configure their values in the envVariables field. [Learn more about environment variables](../customization/configure-request-values.md).',
          'Configure their values in the envVariables field.\n[Learn more about environment variables](../customization/configure-request-values.md).',
        ],
        [
          'First sentence. [Some link](http://example.com) Second sentence.',
          'First sentence.\n[Some link](http://example.com) Second sentence.',
        ],
        [
          'When user change file, he should be navigated on that page in portal. `Editor sends message to portal`.',
          'When user change file, he should be navigated on that page in portal.\n`Editor sends message to portal`.',
        ],
        [
          'First sentence. "Here is a quote with content." Second sentence follows.',
          'First sentence.\n"Here is a quote with content."\nSecond sentence follows.',
        ],
        [
          "First sentence. 'Here is another quote.' Second sentence follows.",
          "First sentence.\n'Here is another quote.'\nSecond sentence follows.",
        ],
        // abbreviations do not end a sentence
        [
          'There is no way to use some existing components (e.g. `OpenApiTryIt`) in markdown files.',
          null,
        ],
        [
          'Compare this vs. that option and see i.e. the difference between them etc. in the docs.',
          null,
        ],
        // A line ending in ':' with two sentences is flagged like one ending in '.'.
        [
          'Each operation specifies the applicable requirement. Typical responses include:',
          'Each operation specifies the applicable requirement.\nTypical responses include:',
        ],
        ['# First. Second.', null],
        // bullets and numbered items keep their marker and indent the continuation under the content
        ['* First sentence. Second sentence.', '* First sentence.\n  Second sentence.'],
        ['- First one here. Second one here.', '- First one here.\n  Second one here.'],
        ['+ First one here. Second one here.', '+ First one here.\n  Second one here.'],
        ['-\tFirst one here. Second one here.', '-\tFirst one here.\n  Second one here.'],
        ['  - First sentence. Second sentence.', '  - First sentence.\n    Second sentence.'],
        ['1. First sentence. Second sentence.', '1. First sentence.\n   Second sentence.'],
        ['- One sentence only, nothing to split here.', null],
        ['1. One sentence only.', null],
        [
          '- Consumes: optional `aws-access-key-id` and `aws-secret-access-key`. Ambient AWS env from the caller when those inputs are empty.',
          '- Consumes: optional `aws-access-key-id` and `aws-secret-access-key`.\n  Ambient AWS env from the caller when those inputs are empty.',
        ],
        // lettered markers are pseudo-lists: skipped, because `a.` looks like a sentence end
        ['a. Lettered item text. It stays skipped.', null],
        ['- a. Lettered text here. More lettered text.\n', null],
        // nested numbered markers: `1.` must not be split from its text
        ['  - 1. Rework permissions\n  - 3. [SCIM](https://docs.github.com/x)\n', null],
        [
          '  - 1. First one here. Second one here.\n',
          '  - 1. First one here.\n       Second one here.\n',
        ],
        // a leading `*`, `**` or `-3` without a following space is prose, not a list marker
        [
          '*emphasis* prose here. Second sentence here.',
          '*emphasis* prose here.\nSecond sentence here.',
        ],
        [
          '**strong** opening here. Second sentence here.',
          '**strong** opening here.\nSecond sentence here.',
        ],
        ['-3 degrees here. Second sentence here.', '-3 degrees here.\nSecond sentence here.'],
        // blockquotes repeat their prefix on continuation lines
        [
          '> First sentence here. Second sentence here.',
          '> First sentence here.\n> Second sentence here.',
        ],
        ['  > First one here. Second one here.', '  > First one here.\n  > Second one here.'],
        ['> > First one here. Second one here.', '> > First one here.\n> > Second one here.'],
        [
          '  > First one here. Second one here. Third one here.',
          '  > First one here.\n  > Second one here.\n  > Third one here.',
        ],
        ['> - First one here. Second one here.', '> - First one here.\n>   Second one here.'],
        // plain indentation is kept
        ['   First one here. Second one here.', '   First one here.\n   Second one here.'],
        // admonition and Markdoc table content
        [
          '{% admonition type="warning" %}\n- Inside first. Inside second.\n{% /admonition %}\n',
          '{% admonition type="warning" %}\n- Inside first.\n  Inside second.\n{% /admonition %}\n',
        ],
        // CRLF content is flagged like LF, and the fixed output keeps CRLF
        [
          'First sentence here. Second sentence here.\r\nAnother line of text.\r\n',
          'First sentence here.\r\nSecond sentence here.\r\nAnother line of text.\r\n',
        ],
      ],
    ],
    [
      'sentence mode with ignoreCodeBlocks',
      { ...sentence, ignoreCodeBlocks: true },
      [
        ['~~~\nFirst sentence. Second sentence.\n~~~\n', null],
        ['    First sentence. Second sentence.\n', null],
      ],
    ],
    [
      'sentence mode with ignoreTables',
      { ...sentence, ignoreTables: true },
      [
        ['| A sentence. | Another. |\n| --- | --- |\n| One. Two. | x |\n', null],
        // A '|' in prose or a code span does not make a line a table row.
        [
          'Use the `true|false` flag to toggle logging. Then restart.',
          'Use the `true|false` flag to toggle logging.\nThen restart.',
        ],
        [
          '{% table %}\n\n- Option\n\n---\n\n- Cell first. Cell second.\n\n{% /table %}\n',
          '{% table %}\n\n- Option\n\n---\n\n- Cell first.\n  Cell second.\n\n{% /table %}\n',
        ],
      ],
    ],
    [
      'phrase mode, which only reports in sentence mode',
      { mode: 'phrase' },
      [['First sentence. Second sentence.', null]],
    ],
  ])('%s', (_label, options, rows) => {
    it.each(rows)('%j', async (content, expected) => {
      const { problems, fixed } = await lintAndFix(content, options);

      expect(problems).toHaveLength(expected === null ? 0 : 1);
      expect(fixed).toBe(expected ?? content);
      expect((await lintAndFix(fixed, options)).problems).toEqual([]);
    });
  });

  it('reports the line of a flagged CRLF line', async () => {
    const content = 'First sentence here. Second sentence here.\r\nAnother line of text.\r\n';

    const { problems } = await lintAndFix(content, sentence);

    expect(problems.map((problem) => problem.line)).toEqual([1]);
  });

  // The runner gives rules segments; a list item's segment text has no marker.
  // fix() must rebuild from the raw source line, or `- First. Second.` would lose its '- '.
  describe('scoped runs', () => {
    const options = { ...sentence, ignoreCodeBlocks: true, ignoreTables: true };
    const listDoc = '- First one here. Second one here.\n';
    const listFixed = '- First one here.\n  Second one here.\n';

    // 'default' is an alias of 'summary'. An undefined scope sees raw lines.
    it.each<[string | undefined, string, number[], string]>([
      ['summary', listDoc, [1], listFixed],
      ['list-item', listDoc, [1], listFixed],
      ['default', listDoc, [1], listFixed],
      [
        'summary',
        '+ First one here. Second one here.\n',
        [1],
        '+ First one here.\n  Second one here.\n',
      ],
      [
        'summary',
        '- First one here. Second one here. Third one here.\n',
        [1],
        '- First one here.\n  Second one here.\n  Third one here.\n',
      ],
      // Both the blockquote and the nested list item segments cover this line, and all fixes must give the same replacement.
      [
        'summary',
        '> - First one here. Second one here.\n',
        [1],
        '> - First one here.\n>   Second one here.\n',
      ],
      [
        undefined,
        '- Bullet first. Bullet second.\n\nPara first. Para second.\n',
        [1, 3],
        '- Bullet first.\n  Bullet second.\n\nPara first.\nPara second.\n',
      ],
      // Scoped and whole-file runs agree on nested numbered lines.
      [
        undefined,
        '- 1. First one here. Second one here.\n',
        [1],
        '- 1. First one here.\n     Second one here.\n',
      ],
      [
        'summary',
        '- 1. First one here. Second one here.\n',
        [1],
        '- 1. First one here.\n     Second one here.\n',
      ],
      [undefined, '- 1. Rework permissions\n', [], '- 1. Rework permissions\n'],
      ['summary', '- 1. Rework permissions\n', [], '- 1. Rework permissions\n'],
    ])('with scope %s lints and fixes %j', async (scope, content, lines, expected) => {
      const rule = { ...createTestRule(options), scope };

      const { problems, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });

      expect(problems.map((problem) => problem.line)).toEqual(lines);
      expect(fixedFiles.get('t.md') ?? content).toBe(expected);

      const relint = await runRules([{ path: 't.md', content: expected }], [rule], { fix: true });
      expect(relint.problems).toEqual([]);
      expect(relint.fixedFiles.size).toBe(0);
    });
  });
});
