import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { validate } from '../config/validate.js';
// `RecheckConfig` and `ValidationError` appear in public signatures, so a
// consumer must be able to name both from the package root `../index.js`
// alone, without reaching into the internal `../types/index.js` barrel.
import {
  lintContent,
  lintFiles,
  parseMarkdown,
  extractScopes,
  type RecheckConfig,
  type RecheckRules,
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
    // Type-level-only assertion: this must compile. A failed
    // `resolveRecheckConfig` call reports `ValidationError[]`, so a consumer
    // handling that failure must be able to name the type.
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

  it('lintContent names the config key of a schema error', async () => {
    const badConfig = { 'custom/x': { severity: 'off' } } as unknown as RecheckConfig;
    await expect(lintContent('# TODO\n', badConfig)).rejects.toThrow(
      "/custom~1x: must have required property 'message'"
    );
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

// The Markdoc config tests exercise the real config path for the two Markdoc
// rules: a user's `RecheckConfig` through `normalizeConfig` into the runner and
// out to the rules. Other Markdoc rule tests hand the runner a pre-built schema
// and skip config validation, so nothing else covers the keys a user actually
// writes.

/** The two rules, in the `recheck/<name>` config form a user writes. */
const RULES: RecheckRules = {
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
          ...RULES['recheck/markdoc-syntax'],
          severity: 'off',
        },
      });
      expect(problems).toEqual([]);
    });
  });
});

describe('lintFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-lint-files-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads image metadata from disk so max-image-size can flag oversized images', async () => {
    const imagePath = path.join(tempDir, 'large.png');
    await fs.writeFile(imagePath, Buffer.alloc(2048, 0)); // 2KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Doc\n\n![Large image](./large.png)\n');

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    // root: image metadata is confined to the lint root (default cwd);
    // these fixtures live under os.tmpdir(), so the root must be passed.
    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('large.png');
  });

  it('flags oversized inline AND reference-style images end-to-end (extractImageReferences <-> max-image-size key parity)', async () => {
    // Proves FIX B's core/files.ts extraction (which builds the
    // fileMetadata.images Map keys) and FIX A's max-image-size rule (which
    // looks images up in that same Map) agree on exactly the same
    // destination strings for both inline and reference-style syntax --
    // the "same normalization on both sides" requirement. A key mismatch
    // here would silently make oversized reference-style images (or, if
    // the mismatch went the other way, inline ones) un-flaggable.
    const inlineImagePath = path.join(tempDir, 'inline-large.png');
    await fs.writeFile(inlineImagePath, Buffer.alloc(2048, 0)); // 2KB

    const refImagePath = path.join(tempDir, 'ref-large.png');
    await fs.writeFile(refImagePath, Buffer.alloc(2048, 0)); // 2KB

    const smallImagePath = path.join(tempDir, 'small.png');
    await fs.writeFile(smallImagePath, Buffer.alloc(512, 0)); // 0.5KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(
      mdPath,
      [
        '# Doc',
        '',
        '![Inline image](./inline-large.png)',
        '',
        '![Reference image][big]',
        '',
        '![Small image](./small.png)',
        '',
        '[big]: ./ref-large.png',
        '',
      ].join('\n')
    );

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(2);
    const messages = problems.map((p) => p.message).sort();
    expect(messages[0]).toContain('inline-large.png');
    expect(messages[1]).toContain('ref-large.png');
  });

  it('does not flag images within the size limit', async () => {
    const imagePath = path.join(tempDir, 'small.png');
    await fs.writeFile(imagePath, Buffer.alloc(512, 0)); // 0.5KB

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Doc\n\n![Small image](./small.png)\n');

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(0);
  });

  it('only writes fixed files back to disk when opts.fix is set', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    const original = '# Doc\nTrailing spaces here   \n';
    await fs.writeFile(mdPath, original);

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const withoutFix = await lintFiles([mdPath], config);
    expect(withoutFix.fixedFiles.size).toBe(0); // fixes aren't computed without opts.fix
    expect(await fs.readFile(mdPath, 'utf8')).toBe(original); // unchanged on disk

    const withFix = await lintFiles([mdPath], config, { fix: true });
    expect(withFix.fixedFiles.get(mdPath)).toBe('# Doc\nTrailing spaces here\n');
    expect(await fs.readFile(mdPath, 'utf8')).toBe('# Doc\nTrailing spaces here\n');
  });

  it('converges ul-style + no-hard-tabs + no-trailing-spaces in a single lintFiles({fix:true}) call', async () => {
    // Regression for FIX 3: this fixture previously needed 3 separate --fix
    // passes to fully converge (whole-line no-hard-tabs fixes discarded
    // sibling fixes on the same line; see core/__tests__/runner.test.ts for the
    // isolated runRules-level repro). lintFiles must loop internally until a
    // pass produces zero fixes so callers get a fully-fixed file in one call.
    //
    // `strict: true` on no-trailing-spaces: the tab->2-spaces fix from
    // no-hard-tabs leaves exactly 2 trailing spaces, which MD009's default
    // `brSpaces: 2` semantics treat as an intentional Markdown hard line
    // break (not flagged). `strict: true` restores "flag ALL trailing
    // whitespace" so this fixture still exercises the same-line multi-rule
    // fix conflict it was designed for.
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '* bullet one\t\n');

    const config: RecheckConfig = {
      'recheck/ul-style': {
        severity: 'error',
        message: 'Use "-" bullets.',
        assertions: { 'ul-style': { style: 'dash' } },
      },
      'recheck/no-hard-tabs': {
        severity: 'error',
        message: 'Use spaces instead of tabs.',
        assertions: { 'no-hard-tabs': { codeBlocks: false, spacesPerTab: 2 } },
      },
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'Remove trailing spaces.',
        assertions: { 'no-trailing-spaces': { codeBlocks: false, strict: true } },
      },
    };

    const { fixedFiles } = await lintFiles([mdPath], config, { fix: true });
    const fixedContent = fixedFiles.get(mdPath);
    expect(fixedContent).toBe('- bullet one\n');

    // A fresh lint of the fixed file must report zero problems from the
    // three rules above — nothing left to fix.
    const { problems } = await lintFiles([mdPath], config);
    expect(problems).toEqual([]);
  });

  // chmod 000 does not stop root (or Windows) from reading the file.
  it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
    'warns and skips an unreadable file but still lints the readable ones',
    async () => {
      const goodPath = path.join(tempDir, 'good.md');
      await fs.writeFile(goodPath, 'Trailing spaces here   \n');

      const unreadablePath = path.join(tempDir, 'unreadable.md');
      await fs.writeFile(unreadablePath, 'Trailing spaces here   \n');
      await fs.chmod(unreadablePath, 0o000);

      const config: RecheckConfig = {
        'recheck/no-trailing-spaces': {
          severity: 'error',
          message: 'No trailing spaces.',
          assertions: { 'no-trailing-spaces': {} },
        },
      };

      const warnings: string[] = [];
      try {
        const { problems } = await lintFiles([goodPath, unreadablePath], config, {
          warn: (message) => warnings.push(message),
        });

        expect(problems).toHaveLength(1);
        expect(problems[0].file).toBe(goodPath);
        expect(
          warnings.some((message) => message.includes(`could not read ${unreadablePath}`))
        ).toBe(true);
      } finally {
        await fs.chmod(unreadablePath, 0o644);
      }
    }
  );

  it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
    'reports unreadable files in skippedFiles so callers can detect incomplete coverage',
    async () => {
      // The warn callback alone gives a programmatic caller (e.g. a security
      // review consuming lint results) no signal that a file was silently
      // dropped from coverage — the returned skippedFiles list is that signal.
      const goodPath = path.join(tempDir, 'good.md');
      await fs.writeFile(goodPath, 'Clean content.\n');

      const unreadablePath = path.join(tempDir, 'unreadable.md');
      await fs.writeFile(unreadablePath, 'Whatever.\n');
      await fs.chmod(unreadablePath, 0o000);

      const config: RecheckConfig = {
        'recheck/no-trailing-spaces': {
          severity: 'error',
          message: 'No trailing spaces.',
          assertions: { 'no-trailing-spaces': {} },
        },
      };

      try {
        const { skippedFiles } = await lintFiles([goodPath, unreadablePath], config);

        expect(skippedFiles).toHaveLength(1);
        expect(skippedFiles[0].path).toBe(unreadablePath);
        expect(skippedFiles[0].reason).toMatch(/permission denied|EACCES/i);
      } finally {
        await fs.chmod(unreadablePath, 0o644);
      }
    }
  );

  it('returns an empty skippedFiles array when every file is readable', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, 'Clean content.\n');

    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    const { skippedFiles } = await lintFiles([mdPath], config);
    expect(skippedFiles).toEqual([]);
  });

  it('honors opts.maxProblems, capping problems and reporting truncated', async () => {
    const config: RecheckConfig = {
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'No trailing spaces.',
        assertions: { 'no-trailing-spaces': {} },
      },
    };

    // Three files, four problem lines each.
    const paths: string[] = [];
    for (const name of ['a.md', 'b.md', 'c.md']) {
      const filePath = path.join(tempDir, name);
      await fs.writeFile(filePath, 'w \nx \ny \nz \n');
      paths.push(filePath);
    }

    const capped = await lintFiles(paths, config, { maxProblems: 5 });
    expect(capped.problems).toHaveLength(5);
    expect(capped.truncated).toBe(true);
    // The cap was hit during b.md, so c.md contributes nothing.
    expect(capped.problems.some((p) => p.file === paths[2])).toBe(false);

    const uncapped = await lintFiles(paths, config);
    expect(uncapped.problems).toHaveLength(12);
    expect(uncapped.truncated).toBe(false);
  });

  it('accepts pre-normalized NormalizedRule[] and skips config validation', async () => {
    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Installing things\n');

    const config: RecheckConfig = {
      'recheck/no-gerund-headings': {
        severity: 'error',
        scope: ['heading.h1'],
        message: 'No gerunds.',
        assertions: { pattern: { ignoreCase: true, tokens: ['^\\w*ing\\b.*'] } },
      },
    };

    const { rules } = await validate(config);
    const { problems } = await lintFiles([mdPath], rules);

    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toContain('no-gerund-headings');
  });
});
