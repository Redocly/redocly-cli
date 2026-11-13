import { createConfig } from '@redocly/openapi-core';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { presets } from '../config/presets/index.js';
import { validate } from '../config/validate.js';
// Both types must be importable from the package root `../index.js`.
import {
  lintContent,
  lintFiles,
  parseMarkdown,
  extractScopes,
  type RecheckConfig,
  type RecheckRules,
  type ValidationError,
} from '../index.js';
import { recheckPresetsPlugin } from '../presets.js';

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
    // Type-only check: this must compile.
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

  // The off rule is not run, but its name is configured, so a directive naming it must not warn as unknown.
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

  // `scope: ['all']` once reported nothing while `scope: all` reported findings. Both must give identical results.
  it.each(['all', 'raw'])(
    'lintContent reports identical findings for the bare scope and its single-element array (%s)',
    async (keyword) => {
      const content = '# Heading\n\nThis line has a TODO marker.\n';
      const configWithScope = (scope: string | string[]): RecheckConfig => ({
        'recheck/no-todo': {
          severity: 'error',
          message: 'TODO found',
          scope,
          assertions: { pattern: { tokens: ['TODO'] } },
        },
      });
      const bare = await lintContent(content, configWithScope(keyword));
      expect(bare.length).toBeGreaterThan(0);
      const array = await lintContent(content, configWithScope([keyword]));
      expect(JSON.stringify(array)).toBe(JSON.stringify(bare));
    }
  );

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
    // Named scopes are combined: heading.h1 and paragraph only.
    const named = await lintContent(content, configWithScope(['heading.h1', 'paragraph']));
    expect(named.map((p) => p.line)).toEqual([1, 3]);
    // Negation: everything except code, so the code-block TODO (line 6) is not reported.
    const negated = await lintContent(content, configWithScope(['~code']));
    expect(negated.length).toBeGreaterThan(0);
    expect(negated.every((p) => p.line === 1 || p.line === 3)).toBe(true);
  });

  // Config callers must get the validation error ("Invalid recheck configuration"), not the
  // compile-time one ("Invalid scope selector"), which is only a backstop.
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
    expect(error.message).not.toMatch(/Invalid scope selector/);
  });

  it('lintContent names the config key of a schema error', async () => {
    const badConfig = { 'custom/x': { severity: 'off' } } as unknown as RecheckConfig;
    await expect(lintContent('# TODO\n', badConfig)).rejects.toThrow(
      "/custom~1x: must have required property 'message'"
    );
  });

  // A valid compound negation selector must still work. Heading and blockquote text also appear in the
  // derived `summary` and `sentence` segments, which these negations do not exclude, so the TODOs on
  // lines 1 and 3 are still reported.
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
    // `lintContent` does not read the disk, so the metadata for max-image-size must be passed in.
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

// These tests use the real config path for the two Markdoc rules. Other Markdoc tests pass a
// ready-made schema and skip config validation.

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

// The Realm schema declares `img` self-closing, so a paired open/close only reports when a schema
// reached the rules. An unclosed `{% img %}` reports either way.
const SELF_CLOSING_MISUSE = '{% img src="a.png" %}\ncaption\n{% /img %}\n';
// A bareword attribute value is a grammar error, whatever the schema.
const GRAMMAR_VIOLATION = '{% widget name=star /%}\n';

const lint = (content: string, config: RecheckConfig) => lintContent(content, config);

describe('shared preset data', () => {
  // Core's merge passes preset rule objects through by reference, and validation writes
  // defaults (such as `scope: 'all'`) into the rules it checks.
  it('lintContent leaves the presets unchanged', async () => {
    const before = JSON.stringify(presets['recheck/google']);
    const config = await createConfig(
      { extends: ['recheck/google'] },
      { plugins: [recheckPresetsPlugin] }
    );
    await lintContent('# Title\n\nSome text.\n', config.recheck.rules as RecheckConfig);
    expect(JSON.stringify(presets['recheck/google'])).toBe(before);
  });
});

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
    await fs.writeFile(imagePath, Buffer.alloc(2048, 0));

    const mdPath = path.join(tempDir, 'doc.md');
    await fs.writeFile(mdPath, '# Doc\n\n![Large image](./large.png)\n');

    const config: RecheckConfig = {
      'recheck/max-image-size': {
        severity: 'error',
        message: 'Image too large: %s',
        assertions: { 'max-image-size': { maxSizeKB: 1 } },
      },
    };

    // Image metadata is limited to the lint root (default cwd), and these fixtures are in os.tmpdir().
    const { problems } = await lintFiles([mdPath], config, { root: tempDir });

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('large.png');
  });

  it('flags oversized inline AND reference-style images end-to-end (extractImageReferences <-> max-image-size key parity)', async () => {
    // The file scan and the max-image-size rule must use the same keys for inline and reference-style
    // images, or one kind would never be flagged.
    const inlineImagePath = path.join(tempDir, 'inline-large.png');
    await fs.writeFile(inlineImagePath, Buffer.alloc(2048, 0));

    const refImagePath = path.join(tempDir, 'ref-large.png');
    await fs.writeFile(refImagePath, Buffer.alloc(2048, 0));

    const smallImagePath = path.join(tempDir, 'small.png');
    await fs.writeFile(smallImagePath, Buffer.alloc(512, 0));

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
    await fs.writeFile(imagePath, Buffer.alloc(512, 0));

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
    expect(await fs.readFile(mdPath, 'utf8')).toBe(original);

    const withFix = await lintFiles([mdPath], config, { fix: true });
    expect(withFix.fixedFiles.get(mdPath)).toBe('# Doc\nTrailing spaces here\n');
    expect(await fs.readFile(mdPath, 'utf8')).toBe('# Doc\nTrailing spaces here\n');
  });

  it('converges ul-style + no-hard-tabs + no-trailing-spaces in a single lintFiles({fix:true}) call', async () => {
    // This fixture used to need 3 `--fix` passes. `lintFiles` must repeat until nothing changes.
    // `strict: true` stops the 2 trailing spaces left by the tab fix from counting as a Markdown line break.
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

    // A fresh lint of the fixed file must report nothing.
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
      // The warn callback alone does not tell a programmatic caller that a file was left out. skippedFiles does.
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
