// Exercises the real config path for the two Markdoc rules: a user's
// `RecheckConfig` through `normalizeConfig` into the runner and out to the
// rules. Other Markdoc rule tests hand the runner a pre-built schema and skip
// config validation, so nothing else covers the keys a user actually writes.
import { describe, expect, it } from 'vitest';

import { lintContent, type RecheckConfig } from '../index.js';

/** The two rules, in the `recheck/<name>` config form a user writes. */
const RULES: RecheckConfig = {
  'recheck/markdoc-syntax': {
    severity: 'error',
    message: 'Markdoc syntax error',
    assertions: { 'markdoc-syntax': {} },
  },
  'recheck/markdoc-pairing': {
    severity: 'error',
    message: '%s',
    assertions: { 'markdoc-pairing': {} },
  },
};

// The Realm schema declares `img` self-closing, so a properly paired
// open/close reports only when a schema actually reached the rules. An
// unclosed `{% img %}` reports either way, so it cannot tell the two apart.
const SELF_CLOSING_MISUSE = '{% img src="a.png" %}\ncaption\n{% /img %}\n';
// Grammar-level, schema-independent: a bareword attribute value.
const GRAMMAR_VIOLATION = '{% widget name=star /%}\n';

const lint = (content: string, config: RecheckConfig) => lintContent(content, config);

describe('markdoc config -> rules (production path via lintContent)', () => {
  describe('markdoc: true', () => {
    it('reaches the rules with the built-in Realm schema (a schema-dependent report fires)', async () => {
      const problems = await lint(SELF_CLOSING_MISUSE, { markdoc: true, ...RULES });
      expect(problems.map((problem) => problem.message)).toEqual([
        '"img" is self-closing and must not be used with a matching {% /img %} close — write {% img /%} instead',
      ]);
      expect(problems[0].ruleName).toBe('recheck/markdoc-pairing');
    });

    it('grammar-level checks fire too', async () => {
      const problems = await lint(GRAMMAR_VIOLATION, { markdoc: true, ...RULES });
      expect(problems).toHaveLength(1);
      expect(problems[0].ruleName).toBe('recheck/markdoc-syntax');
      expect(problems[0].message).toContain('quote the value: name="star"');
    });

    it('the object form { schema: "realm" } behaves identically to the boolean shorthand', async () => {
      const shorthand = await lint(SELF_CLOSING_MISUSE, { markdoc: true, ...RULES });
      const objectForm = await lint(SELF_CLOSING_MISUSE, {
        markdoc: { schema: 'realm' },
        ...RULES,
      });
      expect(objectForm).toEqual(shorthand);
    });
  });

  describe('markdoc: { schema: false }', () => {
    it('still parses and pairs: the grammar-level rule works', async () => {
      const problems = await lint(GRAMMAR_VIOLATION, { markdoc: { schema: false }, ...RULES });
      expect(problems).toHaveLength(1);
      expect(problems[0].ruleName).toBe('recheck/markdoc-syntax');
    });

    it('the schema-dependent report goes silent (nothing to check against)', async () => {
      expect(await lint(SELF_CLOSING_MISUSE, { markdoc: { schema: false }, ...RULES })).toEqual([]);
    });

    it('schema-independent PAIRING still works (an orphaned close reports)', async () => {
      const problems = await lint('{% /admonition %}\n', {
        markdoc: { schema: false },
        ...RULES,
      });
      expect(problems).toHaveLength(1);
      expect(problems[0].ruleName).toBe('recheck/markdoc-pairing');
      expect(problems[0].message).toContain('no well-formed matching open was found');
    });
  });

  describe('markdoc off', () => {
    it('markdoc: false leaves both rules inert even though both are configured', async () => {
      expect(await lint(GRAMMAR_VIOLATION, { markdoc: false, ...RULES })).toEqual([]);
      expect(await lint(SELF_CLOSING_MISUSE, { markdoc: false, ...RULES })).toEqual([]);
    });

    it('an absent markdoc key is the same as false', async () => {
      expect(await lint(GRAMMAR_VIOLATION, { ...RULES })).toEqual([]);
      expect(await lint(SELF_CLOSING_MISUSE, { ...RULES })).toEqual([]);
    });

    it('the fixtures really are violations -- the off cases are not vacuous', async () => {
      expect(await lint(GRAMMAR_VIOLATION, { markdoc: true, ...RULES })).toHaveLength(1);
      expect(await lint(SELF_CLOSING_MISUSE, { markdoc: true, ...RULES })).toHaveLength(1);
    });
  });

  describe('extend.tags', () => {
    it("a project's own self-closing tag reaches the rules", async () => {
      const problems = await lint('{% widget %}\n', {
        markdoc: { schema: 'realm', extend: { tags: { widget: { selfClosing: true } } } },
        ...RULES,
      });
      expect(problems.map((problem) => problem.message)).toEqual([
        '"widget" is self-closing — write {% widget /%}',
      ]);
    });

    it('without the extend, the same tag is unknown and the report does not fire', async () => {
      expect(await lint('{% widget %}\n', { markdoc: true, ...RULES })).toEqual([
        expect.objectContaining({
          ruleName: 'recheck/markdoc-pairing',
          message: expect.stringContaining('never closed'),
        }),
      ]);
    });

    it('extend layers over the Realm base rather than replacing it', async () => {
      const config: RecheckConfig = {
        markdoc: { schema: 'realm', extend: { tags: { widget: { selfClosing: true } } } },
        ...RULES,
      };
      const problems = await lint('{% img src="a.png" %}\n\n{% widget %}\n', config);
      expect(problems.map((problem) => problem.message).sort()).toEqual([
        '"img" is self-closing — write {% img /%}',
        '"widget" is self-closing — write {% widget /%}',
      ]);
    });

    it('extend.tags alongside schema: false has no effect (no base to extend)', async () => {
      expect(
        await lint('{% widget %}\n', {
          markdoc: { schema: false, extend: { tags: { widget: { selfClosing: true } } } },
          ...RULES,
        })
      ).toEqual([expect.objectContaining({ message: expect.stringContaining('never closed') })]);
    });
  });

  describe('severity: off', () => {
    it('a rule turned off does not report even with the flag on', async () => {
      const problems = await lint(GRAMMAR_VIOLATION, {
        markdoc: true,
        ...RULES,
        'recheck/markdoc-syntax': {
          ...(RULES['recheck/markdoc-syntax'] as object),
          severity: 'off',
        },
      } as RecheckConfig);
      expect(problems).toEqual([]);
    });
  });
});
