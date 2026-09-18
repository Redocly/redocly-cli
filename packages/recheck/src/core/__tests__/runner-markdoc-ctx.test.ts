// Covers the `ctx.markdoc` the runner builds for a token rule, using probe
// rules that record what they were handed. The behavior of the real Markdoc
// rules is covered elsewhere.
import { beforeEach, describe, expect, it } from 'vitest';

import type { MarkdocSchema } from '../../parser/markdoc/schema.js';
import { registerTokenRules, clearTokenRulesForTests } from '../../rules/registry.js';
import type { TokenRule, TokenRuleContext } from '../../rules/types.js';
import type { NormalizedRule } from '../../types/index.js';
import { runRules } from '../runner.js';

const SCHEMA: MarkdocSchema = { tags: { img: { selfClosing: true }, box: { selfClosing: true } } };

/** A document with one unclosed tag, so a real pairing pass has something to find. */
const UNCLOSED = '{% admonition %}\ntext\n';

let seen: TokenRuleContext['markdoc'];

/** The `tags: ['markdoc']` marker is what the runner keys the pairing computation off. */
const markdocProbe: TokenRule = {
  name: 'probe-markdoc',
  tags: ['markdoc'],
  fixable: false,
  defaults: { message: 'probe' },
  check(ctx) {
    seen = ctx.markdoc;
  },
};

/** Identical, minus the `markdoc` tag. */
const plainProbe: TokenRule = {
  name: 'probe-plain',
  tags: ['test'],
  fixable: false,
  defaults: { message: 'probe' },
  check(ctx) {
    seen = ctx.markdoc;
  },
};

const ruleFor = (shortName: string): NormalizedRule => ({
  name: `recheck/${shortName}`,
  shortName,
  severity: 'error',
  message: 'probe',
  assertions: { [shortName]: {} },
});

describe('runner: ctx.markdoc', () => {
  beforeEach(() => {
    clearTokenRulesForTests();
    registerTokenRules([markdocProbe, plainProbe]);
    seen = undefined;
  });

  it('is absent entirely when the flag is off', async () => {
    await runRules([{ path: 'a.md', content: UNCLOSED }], [ruleFor('probe-markdoc')]);
    expect(seen).toBeUndefined();
  });

  it('carries the schema and its self-closing set when the flag is on', async () => {
    await runRules([{ path: 'a.md', content: UNCLOSED }], [ruleFor('probe-markdoc')], {
      markdoc: true,
      markdocSchema: SCHEMA,
    });
    expect(seen?.schema).toBe(SCHEMA);
    expect([...(seen?.selfClosingTags ?? [])].sort()).toEqual(['box', 'img']);
  });

  it('the self-closing set is empty under schema: false', async () => {
    await runRules([{ path: 'a.md', content: UNCLOSED }], [ruleFor('probe-markdoc')], {
      markdoc: true,
      markdocSchema: null,
    });
    expect(seen?.schema).toBeNull();
    expect(seen?.selfClosingTags.size).toBe(0);
  });

  // Nothing can read the pairing result unless an active rule carries
  // `tags: ['markdoc']`, so the runner skips that pass otherwise. `ctx.markdoc`
  // is still present either way, because `schema` remains readable.
  describe('pairing is computed only when an active rule carries tags: [markdoc]', () => {
    it('computes it for a markdoc-tagged rule', async () => {
      await runRules([{ path: 'a.md', content: UNCLOSED }], [ruleFor('probe-markdoc')], {
        markdoc: true,
        markdocSchema: SCHEMA,
      });
      expect(seen?.pairing.unclosed).toHaveLength(1);
    });

    it('skips it for a rule without the tag, but still provides ctx.markdoc', async () => {
      await runRules([{ path: 'a.md', content: UNCLOSED }], [ruleFor('probe-plain')], {
        markdoc: true,
        markdocSchema: SCHEMA,
      });
      expect(seen).toBeDefined();
      expect(seen?.schema).toBe(SCHEMA);
      expect([...(seen?.selfClosingTags ?? [])].sort()).toEqual(['box', 'img']);
      expect(seen?.pairing).toEqual({
        pairs: [],
        unclosed: [],
        orphaned: [],
        crossed: [],
        voidMissingSlash: [],
      });
    });

    it('one markdoc-tagged rule among several is enough', async () => {
      await runRules(
        [{ path: 'a.md', content: UNCLOSED }],
        [ruleFor('probe-plain'), ruleFor('probe-markdoc')],
        { markdoc: true, markdocSchema: SCHEMA }
      );
      expect(seen?.pairing.unclosed).toHaveLength(1);
    });

    it('the skipped pairing is a fresh object per file, never a shared one', async () => {
      const captured: NonNullable<TokenRuleContext['markdoc']>['pairing'][] = [];
      clearTokenRulesForTests();
      registerTokenRules([
        {
          ...plainProbe,
          check(ctx) {
            if (ctx.markdoc) captured.push(ctx.markdoc.pairing);
          },
        },
      ]);
      await runRules(
        [
          { path: 'a.md', content: UNCLOSED },
          { path: 'b.md', content: UNCLOSED },
        ],
        [ruleFor('probe-plain')],
        { markdoc: true, markdocSchema: SCHEMA }
      );
      expect(captured).toHaveLength(2);
      expect(captured[0]).not.toBe(captured[1]);
    });
  });
});
