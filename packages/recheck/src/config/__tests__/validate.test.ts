import { describe, it, expect } from 'vitest';

import { presetConfig } from '../../__tests__/preset-block.js';
import { MARKDOC_REALM_SCHEMA } from '../../data/markdoc-realm-schema.js';
import { resolveAssertion } from '../../rules/registry.js';
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

// `all` and `raw` cover the whole document. Combined with other scope entries
// they would match nothing, so validation rejects them.
describe('validate — all/raw scope combinations', () => {
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

// Same mistake inside a selector: `heading & all` matches nothing and `~all`
// matches every segment, so both are rejected.
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

// The JSON schema accepts any value for an assertion, so `validate` has to
// reject non-object values such as `occurrence: "oops"` itself.
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

// `metric` fills four `%s` placeholders (formula, score, min, max). Every
// other assertion and token rule allows two.
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

// `negate` never worked, so it is rejected instead of silently ignored.
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

// A token rule's `defaults` list the options it accepts. Any other option
// is reported as a likely typo.
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

  // These two options are left out of the line-length `defaults` on purpose,
  // so `validate` has to accept them anyway.
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

  // `headings` is not in the required-headings `defaults`, but the rule
  // needs it to do anything.
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

  // An empty array means "expect no headings", which is different from unset.
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

  // `max` has no default, but it is still a known option.
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

// Rule keys can use any namespace, such as `google/no-latinisms`, not only
// `recheck/`.
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

// `markdoc` is a top-level config flag, not a rule. These tests cover config
// handling only.
describe('validate — markdoc flag', () => {
  it('accepts markdoc: true and reports it normalized', async () => {
    const result = await validate({
      markdoc: true,
      'recheck/x': { severity: 'warn', message: 'm', assertions: { 'no-trailing-spaces': {} } },
    });
    expect(result.isValid).toBe(true);
    expect(result.markdoc.enabled).toBe(true);
    // `true` is shorthand for `{ schema: 'realm' }`.
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
            // Replaces the built-in `icon` tag whole, not attribute by attribute.
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
    expect(result.markdoc.schema?.tags['admonition']).toEqual(
      MARKDOC_REALM_SCHEMA.tags['admonition']
    );
  });
  it('rejects an unrecognized schema value', async () => {
    const result = await validate({ markdoc: { schema: 'bogus' } } as any);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.path === '/markdoc/schema')).toBe(true);
    // An object must not also get a misleading "must be boolean" error.
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

describe('markdoc rules without markdoc parsing', () => {
  const rule = { severity: 'error' as const, assertions: { 'markdoc-syntax': {} } };

  it.each([
    ['markdoc is absent', {}, true],
    ['markdoc is false', { markdoc: false }, true],
    ['markdoc is true', { markdoc: true }, false],
  ])(
    'warns when a markdoc rule is on but markdoc parsing is off: %s',
    async (_name, settings, warns) => {
      const warnings: string[] = [];
      const result = await validate(
        { ...settings, 'recheck/markdoc-syntax': { ...rule } },
        { warn: (message) => void warnings.push(message) }
      );
      expect(result.isValid).toBe(true);
      expect(warnings.some((message) => message.includes('"markdoc" parsing is off'))).toBe(warns);
    }
  );

  it('does not warn for a markdoc rule that is off', async () => {
    const warnings: string[] = [];
    await validate(
      { 'recheck/markdoc-syntax': { ...rule, severity: 'off' } },
      { warn: (message) => void warnings.push(message) }
    );
    expect(warnings).toEqual([]);
  });

  it('rejects an `extends` key', async () => {
    const result = await validate({ extends: ['recheck/markdown'] });
    expect(result.isValid).toBe(false);
  });
});

describe('default messages', () => {
  function tokenDefaultMessage(id: string): unknown {
    const resolved = resolveAssertion(id);
    return resolved.kind === 'token' ? resolved.rule.defaults.message : undefined;
  }

  it('fills the token rule default when a preset entry has no message', async () => {
    const result = await validate(await presetConfig(['recheck/markdown']), {
      configDir: process.cwd(),
    });
    expect(result.isValid).toBe(true);
    const rule = result.rules.find((entry) => entry.name === 'recheck/line-length');
    expect(rule?.message).toBeTypeOf('string');
    expect(rule?.message).toBe(tokenDefaultMessage('line-length'));
  });

  it('fills the token rule default for a user entry without extends', async () => {
    const result = await validate(
      { 'recheck/line-length': { severity: 'warn', assertions: { 'line-length': {} } } },
      { configDir: process.cwd() }
    );
    expect(result.isValid).toBe(true);
    expect(result.rules[0].message).toBe(tokenDefaultMessage('line-length'));
  });

  it('keeps an explicit message', async () => {
    const result = await validate(
      await presetConfig(['recheck/markdown'], { 'recheck/line-length': { message: 'Too long' } }),
      { configDir: process.cwd() }
    );
    expect(result.rules.find((entry) => entry.name === 'recheck/line-length')?.message).toBe(
      'Too long'
    );
  });

  it('still rejects an entry with no message and no token default', async () => {
    const result = await validate(
      { 'recheck/nope': { severity: 'error', assertions: { nope: {} } } },
      { configDir: process.cwd() }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.map((error) => error.message).join('\n')).toContain(
      "must have required property 'message'"
    );
  });

  it('still rejects a scope rule entry with no message', async () => {
    const result = await validate(
      { 'recheck/words': { severity: 'error', assertions: { pattern: { tokens: ['foo'] } } } },
      { configDir: process.cwd() }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.map((error) => error.message).join('\n')).toContain(
      "must have required property 'message'"
    );
  });
});
