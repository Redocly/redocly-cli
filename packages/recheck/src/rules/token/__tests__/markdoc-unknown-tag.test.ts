import { describe, it, expect } from 'vitest';

import { MARKDOC_REALM_SCHEMA } from '../../../data/markdoc-realm-schema.js';
import { resolveMarkdocConfig, type MarkdocSchema } from '../../../parser/markdoc/schema.js';
import { tokenRuleHarness } from './harness.js';

const SCHEMA: MarkdocSchema = { tags: { admonition: {}, img: { selfClosing: true } } };

const h = tokenRuleHarness('markdoc-unknown-tag', {}, { markdoc: true, markdocSchema: SCHEMA });
const realm = tokenRuleHarness(
  'markdoc-unknown-tag',
  {},
  { markdoc: true, markdocSchema: MARKDOC_REALM_SCHEMA }
);

describe('markdoc-unknown-tag', () => {
  it('no-ops cleanly when the markdoc flag is off (ctx.markdoc absent)', async () => {
    const off = tokenRuleHarness('markdoc-unknown-tag');
    expect(await off.lint('{% widget %}\ntext\n{% /widget %}\n')).toEqual([]);
  });

  it('is inert under schema: false -- nothing to check tag names against', async () => {
    const noSchema = tokenRuleHarness(
      'markdoc-unknown-tag',
      {},
      { markdoc: true, markdocSchema: null }
    );
    expect(await noSchema.lint('{% widget %}\ntext\n{% /widget %}\n')).toEqual([]);
  });

  it('reports nothing for a tag declared in the schema', async () => {
    expect(await h.lint('{% admonition %}\ntext\n{% /admonition %}\n')).toEqual([]);
  });

  it('reports an unknown open tag, naming it, with the full message asserted by toBe', async () => {
    const problems = await h.lint('{% widget %}\ntext\n{% /widget %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toBe(
      '"widget" is not a known Markdoc tag — check for a typo, or declare it via "extend.tags" if intentional'
    );
  });

  it('reports an unknown self-closing tag the same way', async () => {
    const problems = await h.lint('{% widget /%}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('"widget" is not a known Markdoc tag');
  });

  it('reports the matching open only ONCE -- never doubles up on the close tag', async () => {
    // Real Markdoc raises exactly one tag-undefined error per unknown tag
    // node, located at the open; checking the close too would double-report
    // the same name.
    const problems = await h.lint('{% widget %}\ntext\n{% /widget %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('reports one problem per distinct unknown tag usage, even reusing the same name twice', async () => {
    const problems = await h.lint(
      '{% widget %}\ntext\n{% /widget %}\n\n{% widget %}\nmore\n{% /widget %}\n'
    );
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.line)).toEqual([1, 5]);
  });

  describe('never fires on annotation, variable, or function kinds', () => {
    it('sigil-first annotation (#id / .class)', async () => {
      expect(await h.lint('# Head {% #main %}\n\nPara {% .cls %}text.\n')).toEqual([]);
    });

    it('attribute-first annotation (no tag name at all)', async () => {
      expect(await h.lint('Cell {% width="30%" %} text.\n')).toEqual([]);
    });

    it('variable interpolation', async () => {
      expect(await h.lint('Hello {% $name %}.\n')).toEqual([]);
    });

    it('function interpolation', async () => {
      expect(await h.lint('Hello {% equals(1,1) %}.\n')).toEqual([]);
    });
  });

  it('treats "schemaDefinition" as a documented known-unknown, never reported', async () => {
    // Realm registers "schemaDefinition" inline in markdoc-options.ts, outside
    // the composition the schema generator can import, so it never appears in
    // schema.tags and has to be tolerated by name instead.
    expect(MARKDOC_REALM_SCHEMA.tags.schemaDefinition).toBeUndefined();
    const problems = await realm.lint('{% schemaDefinition schemaRef="#/foo" /%}\n');
    expect(problems).toEqual([]);
  });

  it('still reports a genuinely unknown tag under the real realm schema', async () => {
    const problems = await realm.lint('{% totally-made-up-tag /%}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('"totally-made-up-tag" is not a known Markdoc tag');
  });

  it('a custom tag declared via extend.tags reaches this rule as KNOWN', async () => {
    // Production resolves the `markdoc` config key through
    // resolveMarkdocConfig before the runner sees it, so building the schema
    // the same way here (rather than hand-assembling a merged object) is what
    // proves extend.tags actually reaches the rule.
    const { schema } = resolveMarkdocConfig({
      schema: 'realm',
      extend: { tags: { 'my-widget': { attributes: { id: { type: 'string', required: true } } } } },
    });
    const extended = tokenRuleHarness(
      'markdoc-unknown-tag',
      {},
      { markdoc: true, markdocSchema: schema }
    );
    expect(await extended.lint('{% my-widget id="x" /%}\n')).toEqual([]);
  });

  it('reports come out in document order across multiple unknown tags on one line', async () => {
    const problems = await h.lint('{% zzz /%} and {% yyy /%}\n');
    expect(problems.map((p) => [p.line, p.column])).toEqual([
      [1, 1],
      [1, 16],
    ]);
  });
});
