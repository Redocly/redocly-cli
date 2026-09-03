import { describe, it, expect } from 'vitest';

import { MARKDOC_REALM_SCHEMA } from '../../../data/markdoc-realm-schema.js';
import { resolveMarkdocConfig, type MarkdocSchema } from '../../../parser/markdoc/schema.js';
import { tokenRuleHarness } from './harness.js';

const SCHEMA: MarkdocSchema = {
  tags: {
    // A generic mix of attribute shapes, reused by most single-purpose tests.
    t: {
      attributes: {
        a: { type: 'string' },
        n: { type: 'number' },
        e: { type: 'string', enum: ['x', 'y'] },
        req: { type: 'string', required: true },
        dyn: { type: 'string', dynamic: true, enum: ['x'] },
      },
    },
    // Declares no attributes, so a report on this tag can only mean the
    // shortcut/global-attribute carve-out failed.
    empty: {},
    p: {
      attributes: {
        primary: { type: 'number' },
      },
    },
    np: {
      attributes: {
        a: { type: 'string' },
      },
    },
    widthTag: {
      attributes: {
        width: { type: 'number' },
      },
    },
  },
};

const h = tokenRuleHarness('markdoc-attributes', {}, { markdoc: true, markdocSchema: SCHEMA });
const realm = tokenRuleHarness(
  'markdoc-attributes',
  {},
  { markdoc: true, markdocSchema: MARKDOC_REALM_SCHEMA }
);

describe('markdoc-attributes', () => {
  it('no-ops cleanly when the markdoc flag is off (ctx.markdoc absent)', async () => {
    const off = tokenRuleHarness('markdoc-attributes');
    expect(await off.lint('{% t req="x" /%}\n')).toEqual([]);
  });

  it('is inert under schema: false', async () => {
    const noSchema = tokenRuleHarness(
      'markdoc-attributes',
      {},
      { markdoc: true, markdocSchema: null }
    );
    expect(await noSchema.lint('{% t bogus=1 /%}\n')).toEqual([]);
  });

  it('reports nothing for a well-formed known tag', async () => {
    expect(await h.lint('{% t req="x" a="hi" n=1 e="x" /%}\n')).toEqual([]);
  });

  it('skips an entirely UNKNOWN tag -- markdoc-unknown-tag owns that, not this rule', async () => {
    // Real Markdoc never attribute-checks an undefined tag's node either.
    expect(await h.lint('{% ghost foo=1 bar="x" req=1 /%}\n')).toEqual([]);
  });

  describe('missing required', () => {
    it('reports against the real realm schema (admonition requires type)', async () => {
      const problems = await realm.lint('{% admonition %}\nBe careful.\n{% /admonition %}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(1);
      expect(problems[0].message).toBe('"admonition" is missing its required "type" attribute');
    });

    it('reports nothing once the required attribute is present', async () => {
      const problems = await realm.lint(
        '{% admonition type="info" %}\nBe careful.\n{% /admonition %}\n'
      );
      expect(problems).toEqual([]);
    });

    it('is satisfied by a class/id shortcut when the required name is class/id (schema fold)', async () => {
      // No real schema attribute is both required and named class/id, so the
      // fold can only be exercised against a synthetic schema.
      const req: MarkdocSchema = {
        tags: { rt: { attributes: { id: { type: 'string', required: true } } } },
      };
      const reqH = tokenRuleHarness(
        'markdoc-attributes',
        {},
        { markdoc: true, markdocSchema: req }
      );
      expect(await reqH.lint('{% rt #anything /%}\n')).toEqual([]);
    });

    it('fires even when the required attribute is ALSO dynamic', async () => {
      // `diagram` has a tag-level `validate()`, which marks every one of its
      // attributes dynamic -- but `file` and `type` are also `required`, and
      // `required` is enforced purely by presence, independently of `dynamic`.
      const problems = await realm.lint('{% diagram /%}\n');
      expect(problems).toHaveLength(2);
      expect(problems.map((p) => p.message)).toEqual([
        '"diagram" is missing its required "file" attribute',
        '"diagram" is missing its required "type" attribute',
      ]);
    });
  });

  describe('the historical enum hole: type="information" on admonition', () => {
    it('reports the full enum message with every allowed value, against the real realm schema', async () => {
      const problems = await realm.lint(
        '{% admonition type="information" %}\nBe careful.\n{% /admonition %}\n'
      );
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        '"type" must be one of "warning", "info", "danger", "success", "idea" — got "information"'
      );
    });
  });

  describe('unknown attribute', () => {
    it('reports a name not declared on a known tag', async () => {
      const problems = await h.lint('{% t req="x" zzz=1 /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"zzz" is not a known attribute of "t" — check for a typo');
    });

    it('a tag declaring NO attributes at all flags every plain attribute as unknown', async () => {
      const problems = await h.lint('{% empty zzz=1 /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('"zzz" is not a known attribute of "empty"');
    });
  });

  describe('wrong literal type', () => {
    it('a string literal where a number is declared', async () => {
      const problems = await h.lint('{% widthTag width="wide" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"width" must be a number value — got a string');
    });

    it('a boolean literal where a string is declared', async () => {
      const problems = await h.lint('{% t req="x" a=true /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"a" must be a string value — got a boolean');
    });

    it('a null literal never matches any of the three primitive schema types', async () => {
      const problems = await h.lint('{% t req="x" n=null /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"n" must be a number value — got null');
    });
  });

  describe('dynamic: true skips value checks entirely', () => {
    it('a synthetic dynamic+enum attribute never enum-reports', async () => {
      expect(await h.lint('{% t req="x" dyn="not-x" /%}\n')).toEqual([]);
    });

    it('the real img.align (validate()-carrying tag: ALL attributes dynamic) never enum-reports', async () => {
      // img's tag-level validate() forces every attribute dynamic, so
      // align's real enum goes unchecked -- the accepted cost of skipping
      // value checks on dynamic attributes.
      expect(await realm.lint('{% img align="not-a-real-value" /%}\n')).toEqual([]);
    });

    it('partial.file genuinely has no `required` in the composed schema -- not "fixed" here', async () => {
      expect(await realm.lint('{% partial /%}\n')).toEqual([]);
      expect(await realm.lint('{% partial file="x.md" /%}\n')).toEqual([]);
    });
  });

  describe('opaque variable/function values skip type/enum checks even on a non-dynamic attribute', () => {
    it('a $variable value', async () => {
      expect(await h.lint('{% t req="x" e=$foo /%}\n')).toEqual([]);
    });

    it('a function() value', async () => {
      expect(await h.lint('{% t req="x" e=equals(1,1) /%}\n')).toEqual([]);
    });

    it('a bareword value produces no double report (markdoc-syntax already owns it)', async () => {
      expect(await h.lint('{% t req="x" e=star /%}\n')).toEqual([]);
    });
  });

  describe('primary value validation', () => {
    it('a literal primary validates against the schema attribute literally named "primary"', async () => {
      const problems = await h.lint('{% p "hi" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"primary" must be a number value — got a string');
    });

    it('a matching literal primary reports nothing', async () => {
      expect(await h.lint('{% p 3 /%}\n')).toEqual([]);
    });

    it('a $variable primary is opaque and skipped', async () => {
      expect(await h.lint('{% p $flag /%}\n')).toEqual([]);
    });

    it('a function() primary is opaque and skipped', async () => {
      expect(await h.lint('{% p equals(1,1) /%}\n')).toEqual([]);
    });

    it('a bareword primary produces no double report (markdoc-syntax owns it)', async () => {
      expect(await h.lint('{% p maybe /%}\n')).toEqual([]);
    });

    it('a primary given on a tag whose schema declares no "primary" attribute is unknown', async () => {
      const problems = await h.lint('{% np "x" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        '"primary" is not a known attribute of "np" — check for a typo'
      );
    });
  });

  describe('the `primaryPresent` fold against the real realm schema', () => {
    // `slot` declares its primary as `required` in the real composed schema,
    // so an ordinary `{% slot "name" %}` must satisfy it.
    it('a literal primary satisfies "slot"\'s required primary -- no false positive', async () => {
      expect(await realm.lint('{% slot "name" %}\nbody\n{% /slot %}\n')).toEqual([]);
    });

    it('no primary at all still reports missing-required', async () => {
      const problems = await realm.lint('{% slot %}\nbody\n{% /slot %}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"slot" is missing its required "primary" attribute');
    });
  });

  it('close tags carry no attributes -- markdoc-attributes never checks them', async () => {
    // `req` is satisfied on the open tag, so anything reported here could
    // only have come from the close tag's own attribute list.
    const problems = await h.lint('{% t req="x" %}\nbody\n{% /t badattr=1 %}\n');
    expect(problems).toEqual([]);
  });

  describe('class/id shortcuts are always schema-valid, never "unknown attribute"', () => {
    it('on a tag declaring zero attributes', async () => {
      expect(await h.lint('{% empty .foo #bar /%}\n')).toEqual([]);
    });

    it('named class="..."/id="..." attributes are equally never unknown (Markdoc global attributes)', async () => {
      expect(await h.lint('{% empty class="c" id="i" /%}\n')).toEqual([]);
    });
  });

  describe('a tag declaring its OWN class/id is value-checked, not short-circuited as global (I1)', () => {
    // Real Markdoc spreads `{ ...globalAttributes, ...schema.attributes }`, so
    // a tag's own `id`/`class` declaration wins over the global one and is
    // value-checked like any other attribute. Four Realm tags declare their
    // own `id`: `input`, `step`, `tabs`, `toggle`.
    it('step declares its own required string "id" -- a numeric id is type-checked, not ignored as global', async () => {
      const problems = await realm.lint('{% step id=123 heading="h" %}\nbody\n{% /step %}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"id" must be a string value — got a number');
    });

    it('toggle declares its own required "id" AND "label" -- both wrong types report BOTH', async () => {
      const problems = await realm.lint('{% toggle id=1 label=2 %}\nbody\n{% /toggle %}\n');
      expect(problems).toHaveLength(2);
      expect(problems.map((p) => p.message)).toEqual([
        '"id" must be a string value — got a number',
        '"label" must be a string value — got a number',
      ]);
    });

    it('card does NOT declare its own "id" -- still never "unknown attribute" (true global fold)', async () => {
      expect(await realm.lint('{% card title="t" id="x" %}\nbody\n{% /card %}\n')).toEqual([]);
    });
  });

  describe('duplicate-attribute detection', () => {
    it('two plain same-name attributes', async () => {
      const problems = await h.lint('{% t req="x" a="one" a="two" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"a" is already set earlier on this tag');
    });

    it('two id shortcuts', async () => {
      const problems = await h.lint('{% empty #one #two /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"id" is already set earlier on this tag');
    });

    it('an id shortcut then a colliding id="..." attribute', async () => {
      const problems = await h.lint('{% empty #one id="two" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('"id" is already set earlier');
    });

    it('an id="..." attribute then a colliding id shortcut (reverse order also fires)', async () => {
      const problems = await h.lint('{% empty id="two" #one /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('"id" is already set earlier');
    });

    it('a class shortcut then a colliding class="..." attribute', async () => {
      const problems = await h.lint('{% empty .one class="two" /%}\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('"class" is already set earlier');
    });

    it('REVERSED order (class="..." attribute then a class shortcut) reports NOTHING', async () => {
      // This order-dependent asymmetry is real upstream Markdoc behavior, not
      // an approximation: the class-shortcut branch never checks for a prior
      // value, unlike the id-shortcut and named-attribute branches.
      expect(await h.lint('{% empty class="two" .one /%}\n')).toEqual([]);
    });

    it('two class shortcuts naming the SAME class twice never collide (legitimate merge)', async () => {
      expect(await h.lint('{% empty .one .one /%}\n')).toEqual([]);
    });

    it('two class shortcuts naming different classes never collide either', async () => {
      expect(await h.lint('{% empty .one .two /%}\n')).toEqual([]);
    });

    describe('the positional primary participates in the walk too (M1)', () => {
      // Upstream synthesizes a positional value as a `primary` attribute and
      // runs it through the same check-then-set branch as any named one, so a
      // positional primary followed by `primary=` really is a duplicate. Only
      // that one direction is grammatically possible: a positional value can
      // only appear first (`{% p primary="y" "x" %}` is a parse error).
      it('positional primary alone reports no duplicate', async () => {
        expect(await h.lint('{% p 3 /%}\n')).toEqual([]);
      });

      it('named primary= alone reports no duplicate', async () => {
        expect(await h.lint('{% p primary=5 /%}\n')).toEqual([]);
      });

      it('positional primary THEN a colliding primary= attribute reports a duplicate', async () => {
        const problems = await h.lint('{% p 3 primary=5 /%}\n');
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toBe('"primary" is already set earlier on this tag');
      });
    });
  });

  it('reports intra-tag violations in ascending document order, not check order', async () => {
    // The three reports land at column 1 (missing "req", which has no more
    // specific position), column 6 ("zzz"), and column 14 (the bad enum value).
    const problems = await h.lint('{% t zzz=1 e="bad" /%}\n');
    expect(problems).toHaveLength(3);
    expect(problems.map((p) => p.column)).toEqual(
      [...problems.map((p) => p.column)].sort((a, b) => a - b)
    );
    expect(problems[0].message).toContain('missing its required "req"');
    expect(problems[1].message).toContain('"zzz" is not a known attribute');
    expect(problems[2].message).toContain('must be one of');
  });

  it('a custom tag declared via extend.tags reaches this rule, and its declared attributes validate', async () => {
    const { schema } = resolveMarkdocConfig({
      schema: 'realm',
      extend: { tags: { 'my-widget': { attributes: { id: { type: 'string', required: true } } } } },
    });
    const extended = tokenRuleHarness(
      'markdoc-attributes',
      {},
      { markdoc: true, markdocSchema: schema }
    );
    const problems = await extended.lint('{% my-widget /%}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('"my-widget" is missing its required "id" attribute');
    expect(await extended.lint('{% my-widget id="x" /%}\n')).toEqual([]);
  });
});
