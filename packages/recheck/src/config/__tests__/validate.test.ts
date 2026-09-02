import { describe, it, expect } from 'vitest';

import { MARKDOC_REALM_SCHEMA } from '../../data/markdoc-realm-schema.js';
import { validate } from '../validate.js';

function baseRule(scope: unknown) {
  return {
    'recheck/test-rule': {
      severity: 'error',
      message: 'Test message',
      scope,
      assertions: {
        pattern: { tokens: ['foo'] },
      },
    },
  };
}

describe('validate — scope vocabulary', () => {
  it('accepts scope: summary', async () => {
    const result = await validate(baseRule('summary'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts scope: list-item', async () => {
    const result = await validate(baseRule('list-item'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts scope: ['~blockquote & ~heading']", async () => {
    const result = await validate(baseRule(['~blockquote & ~heading']));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts scope: heading.h3', async () => {
    const result = await validate(baseRule('heading.h3'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts every full-vocabulary scope name', async () => {
    const vocabulary = [
      'all',
      'raw',
      'default',
      'summary',
      'sentence',
      'paragraph',
      'heading',
      'heading.h1',
      'heading.h2',
      'heading.h3',
      'heading.h4',
      'heading.h5',
      'heading.h6',
      'code',
      'list-item',
      'blockquote',
      'table.header',
      'table.cell',
      'markdoc.tag',
      'frontmatter',
      'html',
      'comment',
      'alt',
      'link',
    ];
    for (const scope of vocabulary) {
      const result = await validate(baseRule(scope));
      expect(result.isValid, `expected "${scope}" to be valid`).toBe(true);
    }
  });

  it('rejects scope: bogus with a message naming the bad term', async () => {
    const result = await validate(baseRule('bogus'));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('bogus'))).toBe(true);
  });

  it("rejects scope: ['~']", async () => {
    const result = await validate(baseRule(['~']));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an empty clause in a selector', async () => {
    const result = await validate(baseRule(['heading & ']));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// `all` and `raw` are whole-document keywords, not segment names — combining
// them with any other scope entry can only silently match nothing (the
// extractor never emits segments named 'all'/'raw'), so such configs must be
// rejected loudly instead of validating and then reporting zero findings.
describe('validate — all/raw scope combinations', () => {
  it("accepts single-element scope: ['all'] and scope: ['raw']", async () => {
    for (const scope of [['all'], ['raw']]) {
      const result = await validate(baseRule(scope));
      expect(result.isValid, `expected ${JSON.stringify(scope)} to be valid`).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it("rejects scope: ['all', 'code'] explaining all covers the whole document", async () => {
    const result = await validate(baseRule(['all', 'code']));
    expect(result.isValid).toBe(false);
    const combined = result.errors.find((error) => error.message.includes('cannot be combined'));
    expect(combined).toBeDefined();
    expect(combined?.message).toContain('"all"');
    expect(combined?.message).toContain('whole document');
    expect(combined?.message).toContain('scope: all');
  });

  it("rejects scope: ['raw', 'heading'] the same way", async () => {
    const result = await validate(baseRule(['raw', 'heading']));
    expect(result.isValid).toBe(false);
    const combined = result.errors.find((error) => error.message.includes('cannot be combined'));
    expect(combined).toBeDefined();
    expect(combined?.message).toContain('"raw"');
    expect(combined?.message).toContain('scope: raw');
  });

  it('still accepts multi-element named-scope arrays', async () => {
    const result = await validate(baseRule(['heading.h2', 'paragraph']));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// `all`/`raw` as TERMS inside a selector expression are the same class of
// config mistake as mixing them into a multi-entry array (above): a
// conjunction term (`heading & all`) compiles to a predicate matching
// segments literally named 'all' — which never exist — so the rule silently
// reports nothing; a negated term (`~all`, `~raw`) matches EVERY segment,
// silently meaning "everything" when the set-theoretic reading is
// "nothing". Both must fail validation loudly, in bare-string and
// array-entry forms alike.
describe('validate — all/raw as compound selector terms', () => {
  it("rejects scope: 'heading & all' (bare-string conjunction)", async () => {
    const result = await validate(baseRule('heading & all'));
    expect(result.isValid).toBe(false);
    const combined = result.errors.find((error) => error.message.includes('cannot be combined'));
    expect(combined).toBeDefined();
    expect(combined?.message).toContain('"all"');
    expect(combined?.message).toContain('whole document');
    expect(combined?.message).toContain('scope: all');
  });

  it("rejects scope: ['heading & all'] (array-entry conjunction)", async () => {
    const result = await validate(baseRule(['heading & all']));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('cannot be combined'))).toBe(true);
  });

  it("rejects scope: '~all' explaining the negation is not meaningful", async () => {
    const result = await validate(baseRule('~all'));
    expect(result.isValid).toBe(false);
    const negated = result.errors.find((error) => error.message.includes('not meaningful'));
    expect(negated).toBeDefined();
    expect(negated?.message).toContain('"all"');
    expect(negated?.message).toContain('scope: all');
  });

  it("rejects scope: '~raw' the same way", async () => {
    const result = await validate(baseRule('~raw'));
    expect(result.isValid).toBe(false);
    const negated = result.errors.find((error) => error.message.includes('not meaningful'));
    expect(negated).toBeDefined();
    expect(negated?.message).toContain('"raw"');
    expect(negated?.message).toContain('scope: raw');
  });

  it("rejects scope: ['~code & ~all'] (negated keyword inside a conjunction)", async () => {
    const result = await validate(baseRule(['~code & ~all']));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('not meaningful'))).toBe(true);
  });

  it('still accepts bare all/raw, single-element arrays, and named compound selectors', async () => {
    const validScopes: Array<string | string[]> = [
      'all',
      'raw',
      ['all'],
      ['raw'],
      'heading & ~code',
      ['~code'],
      ['~blockquote & ~heading'],
    ];
    for (const scope of validScopes) {
      const result = await validate(baseRule(scope));
      expect(result.isValid, `expected ${JSON.stringify(scope)} to be valid`).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });
});

// A NON-OBJECT assertion value (e.g. `occurrence: "oops"`) used to early-
// return silently from every per-assertion option validator whose options
// are all optional (pattern, occurrence, repetition, spelling) — the config
// validated cleanly and the assertion then misbehaved (or no-op'd) at lint
// time. The schema can't catch this (`assertions` values are
// `additionalProperties: true`), so the shared `requireOptionsObject`
// helper makes it a uniform validation error for EVERY per-assertion
// validator instead.
describe('validate — non-object assertion options are a uniform error', () => {
  function ruleWith(assertions: Record<string, unknown>) {
    return {
      'recheck/test-rule': {
        severity: 'error',
        message: 'Test message',
        assertions,
      },
    };
  }

  it('rejects pattern: "oops" (legacy assertion) with "assertion options must be an object"', async () => {
    const result = await validate(ruleWith({ pattern: 'oops' }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('pattern assertion options must be an object')
      )
    ).toBe(true);
  });

  it('rejects occurrence: "oops" the same way', async () => {
    const result = await validate(ruleWith({ occurrence: 'oops' }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('occurrence assertion options must be an object')
      )
    ).toBe(true);
  });

  it('rejects repetition: 42 the same way', async () => {
    const result = await validate(ruleWith({ repetition: 42 }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('repetition assertion options must be an object')
      )
    ).toBe(true);
  });

  it('rejects an ARRAY assertion value too (spelling: [])', async () => {
    const result = await validate(ruleWith({ spelling: ['vocab'] }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('spelling assertion options must be an object')
      )
    ).toBe(true);
  });
});

// The `%s` message-placeholder cap is per-assertion, not one global constant:
// `metric` substitutes four values (formula, score, min, max), so a metric
// rule's message may use up to 4 placeholders, while every other assertion and
// every token rule stays capped at 2.
describe('validate — per-assertion message placeholder caps', () => {
  function ruleWith(message: string, assertions: Record<string, unknown>) {
    return {
      'recheck/test-rule': {
        severity: 'error',
        message,
        assertions,
      },
    };
  }

  it('accepts a 4-placeholder message on a metric rule', async () => {
    const result = await validate(
      ruleWith('Readability (%s) is %s; expected between %s and %s.', {
        metric: { formula: 'flesch-reading-ease', min: 30 },
      })
    );
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a 5-placeholder message on a metric rule, naming the cap of 4', async () => {
    const result = await validate(
      ruleWith('%s %s %s %s %s', { metric: { formula: 'flesch-reading-ease', min: 30 } })
    );
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('at most 4') && error.message.includes('found 5')
      )
    ).toBe(true);
  });

  it('still rejects a 3-placeholder message on an occurrence rule (cap stays 2)', async () => {
    const result = await validate(
      ruleWith('%s %s %s', { occurrence: { pattern: '[.!?]', max: 3 } })
    );
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('at most 2') && error.message.includes('found 3')
      )
    ).toBe(true);
  });

  it('still rejects a 3-placeholder message on a token rule (default cap 2)', async () => {
    const result = await validate(ruleWith('%s %s %s', { 'no-trailing-spaces': {} }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('at most 2'))).toBe(true);
  });
});

// The pattern assertion's `negate` option was removed because it never
// functioned in any version: the check always sat inside the match-iteration
// loop, so `negate: true` reported nothing and a pattern's absence never
// reported either. The dead option is now rejected outright.
describe('validate — removed pattern `negate` option', () => {
  function patternRule(options: Record<string, unknown>) {
    return {
      'recheck/test-rule': {
        severity: 'error',
        message: 'Test message',
        assertions: { pattern: options },
      },
    };
  }

  it('rejects pattern.negate: true with a message naming the removed option', async () => {
    const result = await validate(patternRule({ tokens: ['foo'], negate: true }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('negate'))).toBe(true);
  });

  it('rejects pattern.negate: false too (the option is gone, not just the true case)', async () => {
    const result = await validate(patternRule({ tokens: ['foo'], negate: false }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('negate'))).toBe(true);
  });

  it('still accepts a pattern assertion without negate', async () => {
    const result = await validate(patternRule({ tokens: ['foo'], ignoreCase: true }));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// A misspelled option on a ported (token) rule used to validate clean and
// silently no-op -- invisible in a 100-rule style-guide config. Each token
// rule's own `defaults` object is the schema of record (see
// rules/registry.ts resolveAssertion + each rule's `defaults`).
describe('validate — unknown options on token rules', () => {
  it('rejects an unknown option on a token rule', async () => {
    const result = await validate({
      'recheck/lines': {
        severity: 'error',
        message: 'Too long',
        assertions: { 'line-length': { lineLenght: 80 } }, // typo: lineLenght
      },
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('lineLenght'))).toBe(true);
  });

  it('accepts every option a token rule declares in its defaults', async () => {
    const result = await validate({
      'recheck/lines': {
        severity: 'error',
        message: 'Too long',
        assertions: { 'line-length': { lineLength: 80, codeBlocks: false, tables: false } },
      },
    });
    expect(result.errors.filter((e) => e.path?.includes('line-length'))).toEqual([]);
  });

  // `defaults` is not the complete option schema for every token rule:
  // line-length deliberately omits `headingLineLength`/`codeBlockLineLength` so
  // a literal default there cannot shadow a user's `lineLength` override. Both
  // options are real and read at check() time, so validate() must accept them.
  it('accepts headingLineLength and codeBlockLineLength on line-length', async () => {
    const result = await validate({
      'recheck/lines': {
        severity: 'error',
        message: 'Too long',
        assertions: {
          'line-length': { lineLength: 80, headingLineLength: 100, codeBlockLineLength: 100 },
        },
      },
    });
    expect(result.errors.filter((e) => e.path?.includes('line-length'))).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  // required-headings' `defaults` similarly omits `headings` -- the ONE
  // option that makes the rule do anything (see rules/token/required-headings.ts
  // check()'s `ctx.config.headings` read). Without it declared, the rule is
  // unconfigurable through validate().
  it('accepts headings on required-headings', async () => {
    const result = await validate({
      'recheck/structure': {
        severity: 'error',
        message: 'Required heading structure',
        assertions: {
          'required-headings': { headings: ['# Title', '## Intro'] },
        },
      },
    });
    expect(result.errors.filter((e) => e.path?.includes('required-headings'))).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  // An explicit `headings: []` is meaningfully different from leaving the
  // option unset (see required-headings.ts's check() comment: "expect a
  // document with no headings" vs. "not configured") -- it must validate
  // just as cleanly as a non-empty array.
  it('accepts an explicit empty headings array on required-headings', async () => {
    const result = await validate({
      'recheck/structure': {
        severity: 'error',
        message: 'Required heading structure',
        assertions: {
          'required-headings': { headings: [] },
        },
      },
    });
    expect(result.errors.filter((e) => e.path?.includes('required-headings'))).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  // list-length declares `max: undefined` in its `defaults` because `max` has
  // no default value -- an unbounded list is not wrong by itself -- but it must
  // still appear in `Object.keys(defaults)` so validate()'s accepted-option
  // allowlist recognizes it as real rather than rejecting it as unknown.
  it('accepts max on list-length despite its default being undefined', async () => {
    const result = await validate({
      'recheck/lists': {
        severity: 'error',
        message: 'List length',
        assertions: { 'list-length': { min: 2, max: 7 } },
      },
    });
    expect(result.errors.filter((e) => e.path?.includes('list-length'))).toEqual([]);
    expect(result.isValid).toBe(true);
  });
});

// The rule-key pattern widened from `^recheck/[a-z0-9-_]+$` to
// `^[a-z][a-z0-9-]*/[a-z0-9-_]+$` so flagship presets can namespace their own
// rule ids (`google/no-latinisms`, `microsoft/use-contractions`) without
// colliding with `recheck/*` or each other. These pin the accepted and rejected
// shapes so a future edit cannot silently loosen or tighten the pattern.
describe('validate — namespaced rule key pattern', () => {
  function ruleWithKey(key: string) {
    return {
      [key]: {
        severity: 'error',
        message: 'Test message',
        assertions: { pattern: { tokens: ['foo'] } },
      },
    };
  }

  it('accepts a well-formed namespaced key', async () => {
    const result = await validate(ruleWithKey('google/no-latinisms'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts a different namespace', async () => {
    const result = await validate(ruleWithKey('microsoft/use-contractions'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts the original recheck/ namespace unaffected by the widening', async () => {
    const result = await validate(ruleWithKey('recheck/no-hard-tabs'));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.each([
    ['Google/foo', 'uppercase-led namespace'],
    ['9google/foo', 'digit-led namespace'],
    ['google_x/foo', 'underscore in namespace'],
    ['google/FOO', 'uppercase rule name'],
    ['google//foo', 'doubled slash'],
    ['nokey', 'no slash at all'],
  ])('rejects %s (%s)', async (key) => {
    const result = await validate(ruleWithKey(key));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// `markdoc` is an opt-in, top-level config flag rather than a rule. These tests
// cover only the config plumbing -- normalization and validation -- not any
// tokenization behavior.
describe('validate — markdoc flag', () => {
  it('accepts markdoc: true and reports it normalized', async () => {
    const result = await validate({
      markdoc: true,
      'recheck/x': { severity: 'warn', message: 'm', assertions: { 'no-trailing-spaces': {} } },
    });
    expect(result.isValid).toBe(true);
    expect(result.markdoc.enabled).toBe(true);
    // `markdoc: true` is shorthand for `{ schema: 'realm' }`, the built-in
    // schema rather than an empty placeholder.
    expect(result.markdoc.schema).toBe(MARKDOC_REALM_SCHEMA);
  });
  it('defaults markdoc to disabled when absent', async () => {
    const result = await validate({
      'recheck/x': { severity: 'warn', message: 'm', assertions: { 'no-trailing-spaces': {} } },
    });
    expect(result.markdoc).toEqual({ enabled: false, schema: null });
  });
  it('rejects a non-boolean, non-object markdoc value', async () => {
    const result = await validate({ markdoc: 'yes' } as any);
    expect(result.isValid).toBe(false);
  });
});

// The object form alongside the boolean shorthand:
// `markdoc: { schema: 'realm' | false, extend?: { tags: ... } }`.
describe('validate — markdoc object form', () => {
  it('accepts { schema: "realm" } and resolves the built-in schema', async () => {
    const result = await validate({ markdoc: { schema: 'realm' } });
    expect(result.isValid).toBe(true);
    expect(result.markdoc).toEqual({ enabled: true, schema: MARKDOC_REALM_SCHEMA });
  });
  it('accepts { schema: false }: parsing stays on, schema is null', async () => {
    const result = await validate({ markdoc: { schema: false } });
    expect(result.isValid).toBe(true);
    expect(result.markdoc).toEqual({ enabled: true, schema: null });
  });
  it('merges extend.tags over the realm base, overriding a colliding name', async () => {
    const result = await validate({
      markdoc: {
        schema: 'realm',
        extend: {
          tags: {
            'my-widget': {
              selfClosing: true,
              attributes: { id: { type: 'string', required: true } },
            },
            // Overrides the built-in `icon` tag entirely: a whole-tag replace,
            // not a per-attribute merge.
            icon: { attributes: { name: { type: 'string', required: true } } },
          },
        },
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.markdoc.schema?.tags['my-widget']).toEqual({
      selfClosing: true,
      attributes: { id: { type: 'string', required: true } },
    });
    expect(result.markdoc.schema?.tags['icon']).toEqual({
      attributes: { name: { type: 'string', required: true } },
    });
    // Every other built-in tag survives the merge untouched.
    expect(result.markdoc.schema?.tags['admonition']).toEqual(
      MARKDOC_REALM_SCHEMA.tags['admonition']
    );
  });
  it('rejects an unrecognized schema value', async () => {
    const result = await validate({ markdoc: { schema: 'bogus' } } as any);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.path === '/markdoc/schema')).toBe(true);
    // Under `oneOf: [boolean, object]` AJV reported every failing branch, so an
    // object input led with a misleading `/markdoc: must be boolean` ahead of
    // the relevant schema error. Asserting the first error pins that an object
    // input is now only ever checked against the object-shaped schema.
    expect(result.errors[0]?.path).toBe('/markdoc/schema');
    expect(result.errors.some((error) => error.message.includes('must be boolean'))).toBe(false);
  });
  it('a non-boolean, non-object markdoc value still leads with the boolean type error', async () => {
    const result = await validate({ markdoc: 'yes' } as any);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.message).toContain('must be boolean');
  });
  it('rejects an unknown top-level key on the markdoc object', async () => {
    const result = await validate({ markdoc: { schema: 'realm', bogus: true } } as any);
    expect(result.isValid).toBe(false);
    // Same routing guarantee: the leading error names the unknown key, not a
    // spurious boolean-type complaint.
    expect(result.errors[0]?.message).toContain('additional properties');
    expect(result.errors.some((error) => error.message.includes('must be boolean'))).toBe(false);
  });
  it('rejects an unknown key inside an extend.tags tag entry', async () => {
    const result = await validate({
      markdoc: { schema: 'realm', extend: { tags: { widget: { bogus: true } } } },
    } as any);
    expect(result.isValid).toBe(false);
  });
  it('rejects an unknown key inside an extend.tags attribute entry', async () => {
    const result = await validate({
      markdoc: {
        schema: 'realm',
        extend: { tags: { widget: { attributes: { id: { type: 'string', bogus: true } } } } },
      },
    } as any);
    expect(result.isValid).toBe(false);
  });
  it('rejects an object form missing schema', async () => {
    const result = await validate({ markdoc: {} } as any);
    expect(result.isValid).toBe(false);
  });
});

describe('top-level excludes', () => {
  const rule = {
    severity: 'error' as const,
    message: 'm',
    assertions: { pattern: { tokens: ['zzz'] } },
  };

  it('applies to every rule', async () => {
    const result = await validate({
      excludes: ['**/_partials/**'],
      'test/a': { ...rule },
      'test/b': { ...rule },
    } as never);

    expect(result.isValid).toBe(true);
    expect(result.rules.map((r) => r.excludes)).toEqual([['**/_partials/**'], ['**/_partials/**']]);
  });

  it('merges ahead of a rule that has its own excludes', async () => {
    const result = await validate({
      excludes: ['**/_partials/**'],
      'test/a': { ...rule, excludes: ['CHANGELOG.md'] },
    } as never);

    expect(result.rules[0].excludes).toEqual(['**/_partials/**', 'CHANGELOG.md']);
  });

  it('is not itself treated as a rule', async () => {
    const result = await validate({
      excludes: ['**/_partials/**'],
      'test/a': { ...rule },
    } as never);

    expect(result.rules.map((r) => r.name)).toEqual(['test/a']);
  });
});

describe('top-level baseline key', () => {
  const rule = {
    severity: 'error' as const,
    message: 'm',
    assertions: { pattern: { tokens: ['zzz'] } },
  };

  it('accepts a path, returns it, and keeps it out of rule iteration', async () => {
    const result = await validate({
      baseline: './recheck-baseline.yaml',
      'test/a': { ...rule },
    } as never);
    expect(result.isValid).toBe(true);
    expect(result.baselinePath).toBe('./recheck-baseline.yaml');
    expect(result.rules.map((r) => r.name)).toEqual(['test/a']);
  });

  it('rejects a non-string value', async () => {
    const result = await validate({ baseline: 42, 'test/a': { ...rule } } as never);
    expect(result.isValid).toBe(false);
  });

  it('is absent when the config does not set it', async () => {
    const result = await validate({ 'test/a': { ...rule } } as never);
    expect(result.baselinePath).toBeUndefined();
  });
});
