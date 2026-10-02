// Checks the `ctx.markdoc` that the runner passes to token rules, using probe rules.
import { beforeEach, describe, expect, it } from 'vitest';

import type { MarkdocSchema } from '../../parser/markdoc/schema.js';
import { registerTokenRules } from '../../rules/registry.js';
import type { TokenRule, TokenRuleContext } from '../../rules/types.js';
import type { NormalizedRule } from '../../types/index.js';
import { runRules } from '../runner.js';

const SCHEMA: MarkdocSchema = { tags: { img: { selfClosing: true }, box: { selfClosing: true } } };

/** A document with one unclosed tag. */
const UNCLOSED = '{% admonition %}\ntext\n';

let seen: TokenRuleContext['markdoc'];

/** The `markdoc` tag tells the runner to compute tag pairing. */
const markdocProbe: TokenRule = {
  name: 'probe-markdoc',
  tags: ['markdoc'],
  fixable: false,
  defaults: { message: 'probe' },
  check(ctx) {
    seen = ctx.markdoc;
  },
};

/** The same rule without the `markdoc` tag. */
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

  // The runner skips the pairing pass unless an active rule has `tags: ['markdoc']`.
  // `ctx.markdoc` is always set, because `schema` can still be read.
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
