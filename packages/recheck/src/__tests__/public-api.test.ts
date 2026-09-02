import { describe, expect, it } from 'vitest';

// Regression for FIX 2: `RecheckConfig` and `ValidationError` are both used
// in public signatures (lintContent/lintFiles take a RecheckConfig;
// LoadResult contains ValidationError[]) but were previously only
// re-exported from the internal `../types/index.js` barrel, not from the
// package root `../index.js` itself — a consumer importing only the public
// entry point (as `@redocly/recheck` resolves) had no way to name these
// types. This import must resolve from `../index.js` alone.
import {
  lintContent,
  parseMarkdown,
  extractScopes,
  type RecheckConfig,
  type ValidationError,
} from '../index.js';

const config: RecheckConfig = {
  'recheck/no-gerund-headings': {
    severity: 'error',
    scope: ['heading.h1', 'heading.h2'],
    message: 'No gerunds.',
    assertions: { pattern: { ignoreCase: true, tokens: ['^\\w*ing\\b.*'] } },
  },
};

describe('public API', () => {
  it('exposes ValidationError as a usable type from the package root', () => {
    // Type-level-only assertion: this must compile. ValidationError is what
    // LoadResult.errors is typed as (see config/load.ts), so a consumer
    // handling loadConfig() failures needs to be able to name this type
    // without reaching into ../types/index.js directly.
    const error: ValidationError = {
      message: 'Unknown assertion type "foo"',
      path: 'rule.assertions.foo',
    };
    expect(error.message).toContain('Unknown assertion type');
  });

  it('lintContent lints a markdown string without any file I/O', async () => {
    const problems = await lintContent('# Installing things\n\nBody.\n', config);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('exposes the token tree and scopes as public API', () => {
    const tree = parseMarkdown('# T\n');
    expect(extractScopes(tree, '# T\n').some((s) => s.scope === 'heading.h1')).toBe(true);
  });

  it('lintContent does not run rules with severity: off', async () => {
    const offConfig: RecheckConfig = {
      'recheck/disabled-rule': {
        severity: 'off',
        message: 'Should never fire.',
        assertions: { pattern: { tokens: ['Installing'] } },
      },
    };
    const problems = await lintContent('# Installing things\n\nBody.\n', offConfig);
    expect(problems).toEqual([]);
  });

  // The off-rule is filtered out of the RUN list, but its name is still
  // CONFIGURED -- a directive suppressing it is a deliberate no-op, not a
  // typo, so it must not surface an "unknown rule" warning.
  it('lintContent does not warn for a directive naming a configured severity:off rule', async () => {
    const offConfig: RecheckConfig = {
      'recheck/disabled-rule': {
        severity: 'off',
        message: 'Should never fire.',
        assertions: { pattern: { tokens: ['Installing'] } },
      },
    };
    const problems = await lintContent(
      '<!-- recheck-disable disabled-rule -->\n\n# Installing things\n\nBody.\n',
      offConfig
    );
    expect(problems).toEqual([]);
  });

  it('lintContent still warns for a directive naming a rule missing from the config entirely', async () => {
    const problems = await lintContent('<!-- recheck-disable no-such-rule -->\n\nBody.\n', config);
    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toBe('recheck-directive');
    expect(problems[0].message).toContain('no-such-rule');
  });

  // Regression for the array-form all/raw scope bug: `scope: ['all']` used to
  // fall through to ordinary name predicates (extractScopes never emits
  // segments named 'all'/'raw'), so the rule silently reported NOTHING while
  // the identical `scope: all` reported findings — and the config still
  // validated. Both forms must report identically, byte-for-byte.
  it("lintContent reports identical findings for scope: all and scope: ['all']", async () => {
    const content = '# Heading\n\nThis line has a TODO marker.\n';
    const configWithScope = (scope: string | string[]): RecheckConfig => ({
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope,
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    });
    const bare = await lintContent(content, configWithScope('all'));
    expect(bare.length).toBeGreaterThan(0); // sanity: the rule fires unscoped
    const array = await lintContent(content, configWithScope(['all']));
    expect(JSON.stringify(array)).toBe(JSON.stringify(bare));
  });

  it("lintContent reports identical findings for scope: raw and scope: ['raw']", async () => {
    const content = '# Heading\n\nThis line has a TODO marker.\n';
    const configWithScope = (scope: string | string[]): RecheckConfig => ({
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope,
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    });
    const bare = await lintContent(content, configWithScope('raw'));
    expect(bare.length).toBeGreaterThan(0);
    const array = await lintContent(content, configWithScope(['raw']));
    expect(JSON.stringify(array)).toBe(JSON.stringify(bare));
  });

  it('lintContent still honors named-scope arrays and negation arrays', async () => {
    const content = '# A TODO heading\n\nA TODO paragraph.\n\n```\nTODO in code\n```\n';
    const configWithScope = (scope: string | string[]): RecheckConfig => ({
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope,
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    });
    // Named-scope array ORs its entries: heading.h1 + paragraph only.
    const named = await lintContent(content, configWithScope(['heading.h1', 'paragraph']));
    expect(named.map((p) => p.line)).toEqual([1, 3]);
    // Negation array: every segment except code — the code-block TODO
    // (line 6) must not be reported, everything else still is.
    const negated = await lintContent(content, configWithScope(['~code']));
    expect(negated.length).toBeGreaterThan(0);
    expect(negated.every((p) => p.line === 1 || p.line === 3)).toBe(true);
  });

  // `scope: 'heading & all'` used to VALIDATE and then compile to a
  // predicate matching segments literally named 'all' — which never exist —
  // so the rule silently reported nothing (0 findings where scope: heading
  // reported 1). lintContent validates its config, so it must reject the
  // selector loudly instead of running a rule that can never fire.
  it('lintContent rejects all/raw as a conjunction term instead of silently reporting nothing', async () => {
    const badConfig: RecheckConfig = {
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope: 'heading & all',
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    };
    await expect(lintContent('# A TODO heading\n\nA TODO paragraph.\n', badConfig)).rejects.toThrow(
      /cannot be combined/
    );
  });

  // `scope: ['~all']` used to compile to a predicate that matched EVERY
  // segment (no segment is named 'all', so the negation was always true) —
  // silently meaning "everything" when the set-theoretic reading of ~all is
  // "nothing". It must be rejected loudly.
  it('lintContent rejects ~all instead of silently matching every segment', async () => {
    const badConfig: RecheckConfig = {
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope: ['~all'],
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    };
    await expect(lintContent('# TODO\n', badConfig)).rejects.toThrow(/not meaningful/);
  });

  // Config-driven callers must keep hitting VALIDATION's unknown-scope
  // check first (the "Invalid recheck configuration" wrapper), never
  // compileSelector's own compile-time throw ("Invalid scope selector") —
  // locks that the compile-time unknown-term rejection stays a bypass-path
  // backstop and changes nothing in the config pipeline.
  it('lintContent rejects unknown selector terms at validation, before compilation', async () => {
    const badConfig: RecheckConfig = {
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope: 'heading & ALL',
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    };
    const error = await lintContent('# TODO\n', badConfig).then(
      () => {
        throw new Error('expected lintContent to reject the unknown scope term');
      },
      (thrown: unknown) => thrown as Error
    );
    expect(error.message).toMatch(/^Invalid recheck configuration:/);
    expect(error.message).toMatch(/unknown scope "ALL"/);
    // compileSelector's own throw must never be what config callers see.
    expect(error.message).not.toMatch(/Invalid scope selector/);
  });

  // Lock the legit compound-negation selector end-to-end (the spec's own
  // example) so the all/raw-term rejection can't over-reach. Note the
  // selector filters by segment NAME: heading and blockquote text is
  // excluded under its own scope name, but both ALSO surface via the
  // derived `summary` segments (`summary` mirrors every prose kind —
  // headings included), and blockquote text via `sentence` too; neither
  // `~blockquote` nor `~heading` excludes those derived names, so the
  // heading TODO (line 1) and blockquote TODO (line 3) are still reported.
  it("lintContent still honors '~blockquote & ~heading' end-to-end", async () => {
    const content =
      '# A TODO heading\n\n> A TODO quote.\n\nA TODO paragraph.\n\n```\nTODO in code\n```\n';
    const config: RecheckConfig = {
      'recheck/no-todo': {
        severity: 'error',
        message: 'TODO found',
        scope: ['~blockquote & ~heading'],
        assertions: { pattern: { tokens: ['TODO'] } },
      },
    };
    const problems = await lintContent(content, config);
    const lines = problems.map((problem) => problem.line).sort((a, b) => a - b);
    expect(lines).toEqual([1, 3, 5, 8]);
  });

  it('lintContent flags an oversized image when the caller supplies metadata', async () => {
    const imageSizeConfig: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 100 } },
      },
    };
    // lintContent has no disk access, so the caller (mirroring what lintFiles
    // does internally via loadImageMetadata) must supply metadata for
    // max-image-size to have anything to check against.
    const metadata = {
      images: new Map([
        ['./images/large.png', { path: './images/large.png', size: 150 * 1024, exists: true }],
      ]),
    };
    const problems = await lintContent('![Large image](./images/large.png)\n', imageSizeConfig, {
      metadata,
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      ruleName: expect.stringContaining('max-image-size'),
      message: expect.stringContaining('./images/large.png'),
    });
  });
});
