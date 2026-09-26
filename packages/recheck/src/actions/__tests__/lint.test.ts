// Output formatting is tested in packages/cli/src/commands/recheck/__tests__/print.test.ts.
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { withPresets } from '../../config/__tests__/with-presets.js';
import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
import type { Problem } from '../../types/index.js';
import { runLint, type LintRunReport, type LintRunResult } from '../lint.js';

// A prose line longer than the `recheck/line-length` limit of 80 characters.
const LONG_LINE = 'word '.repeat(30).trim();

/** Merges the named presets into `block`, as core does for `extends`, and
 *  resolves the result without writing anything to disk. */
async function resolveConfig(
  configDir: string,
  block: Record<string, unknown> = {},
  extendsList?: string[]
): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({
    block: withPresets(extendsList ?? [], block),
    configDir,
  });
  if (!result.success) {
    throw new Error(
      `config resolution failed: ${result.errors.map((error) => error.message).join('; ')}`
    );
  }
  return result.config;
}

/** Narrows a run result to a completed report, failing the test otherwise. */
function completed(result: LintRunResult): LintRunReport {
  if (result.status !== 'completed') {
    throw new Error(`expected a completed run, got ${JSON.stringify(result)}`);
  }
  return result;
}

function errorsIn(problems: Problem[]): Problem[] {
  return problems.filter((problem) => problem.severity === 'error');
}

describe('runLint', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-run-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_e) {
      // ignore cleanup error
    }
  });

  describe('CLI option validation', () => {
    it('should handle empty directories gracefully', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      const config = await resolveConfig(emptyDir, {}, ['recheck/markdown']);
      const report = completed(await runLint(emptyDir, config, {}));

      expect(report.filesFound).toBe(0);
      expect(report.empty).toBe(true);
      expect(report.problems).toEqual([]);
    });
  });

  describe('File processing edge cases', () => {
    it('should handle directories with no markdown files', async () => {
      // Create non-markdown files
      await fs.writeFile(path.join(tempDir, 'config.json'), '{}');
      await fs.writeFile(path.join(tempDir, 'README.txt'), 'Not markdown');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/test-rule': {
            severity: 'warn',
            message: 'Test',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, {}));

      expect(report.filesFound).toBe(0);
      expect(errorsIn(report.problems)).toHaveLength(0);
    });

    it('should handle empty markdown files', async () => {
      const mdPath = path.join(tempDir, 'empty.md');
      await fs.writeFile(mdPath, '');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/test-rule': {
            severity: 'warn',
            message: 'Test',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, {}));

      expect(report.filesFound).toBe(1);
      expect(errorsIn(report.problems)).toHaveLength(0);
    });

    // The CLI filters severity:off rules out of the run list before
    // runRules, but a directive naming one is a deliberate no-op, not a
    // typo -- only a name absent from the CONFIG entirely may warn.
    it('does not warn for a directive naming a severity:off rule; still warns for an unknown name', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(
        mdPath,
        '<!-- recheck-disable muted-rule -->\n\n<!-- recheck-disable no-such-rule -->\n\nBody.\n'
      );

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/muted-rule': {
            severity: 'off',
            message: 'Never fires',
            assertions: { pattern: { tokens: ['nomatch'] } },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, {}));
      const messages = report.problems.map((problem) => problem.message);

      expect(errorsIn(report.problems)).toHaveLength(0); // directive warnings are warn-severity
      expect(messages.some((message) => message.includes('unknown rule "no-such-rule"'))).toBe(
        true
      );
      expect(messages.some((message) => message.includes('unknown rule "muted-rule"'))).toBe(false);
    });
  });

  describe('Auto-fix functionality', () => {
    it('should apply auto-fixes when --fix is enabled', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nThis has trailing spaces   \nAnother line');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/no-trailing-spaces': {
            severity: 'error',
            message: 'No trailing spaces',
            assertions: { 'no-trailing-spaces': {} },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, { fix: true }));

      // Still reports the original issues even after fixing.
      expect(errorsIn(report.problems).length).toBeGreaterThan(0);
      expect(report.fixes?.applied.length).toBeGreaterThan(0);

      // Verify file was actually fixed
      const fixedContent = await fs.readFile(mdPath, 'utf8');
      expect(fixedContent).toBe('# Test\nThis has trailing spaces\nAnother line');
    });

    it('converges multi-rule fixes on the same line in a single --fix run', async () => {
      // '* bullet one\t\n' under ul-style + no-hard-tabs + no-trailing-spaces
      // used to need 3 separate --fix invocations to fully converge. One
      // `runLint(..., {fix:true})` call must now produce the fixed file.
      //
      // `strict: true` on no-trailing-spaces: the tab->2-spaces fix from
      // no-hard-tabs leaves exactly 2 trailing spaces, which MD009's default
      // `brSpaces: 2` semantics treat as an intentional Markdown hard line
      // break (not flagged). `strict: true` restores "flag ALL trailing
      // whitespace" so this fixture still exercises the same-line
      // multi-rule fix conflict it was designed for.
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '* bullet one\t\n');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/ul-style': {
            severity: 'error',
            message: "Use '-' bullets",
            assertions: { 'ul-style': { style: 'dash' } },
          },
          'recheck/no-hard-tabs': {
            severity: 'error',
            message: 'Use spaces instead of tabs',
            assertions: { 'no-hard-tabs': { codeBlocks: false, spacesPerTab: 2 } },
          },
          'recheck/no-trailing-spaces': {
            severity: 'error',
            message: 'Remove trailing spaces',
            assertions: { 'no-trailing-spaces': { codeBlocks: false, strict: true } },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, { fix: true }));

      const fixedContent = await fs.readFile(mdPath, 'utf8');
      expect(fixedContent).toBe('- bullet one\n');

      // 4 fixes are PROPOSED across passes (pass 1's no-trailing-spaces
      // fix conflicts with no-hard-tabs' and is skipped, then re-proposed
      // and applied in pass 2) but only 3 ever land — the report must show
      // the true count, not every proposal.
      expect(report.fixes?.applied).toHaveLength(3);
      // The skipped-then-reapplied fix converged, so no warning is due.
      expect(report.fixes?.skippedCount).toBe(0);
    });

    it('should report when no auto-fixable issues found', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nSome content');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/non-fixable-rule': {
            severity: 'error',
            message: 'Cannot fix this',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, { fix: true }));

      expect(errorsIn(report.problems).length).toBeGreaterThan(0); // Still has unfixable errors
      expect(report.fixes).toEqual({ applied: [], skippedCount: 0 });
    });
  });

  describe('Multi-assertions support', () => {
    it('runs all assertions in a rule and supports native swap/pattern', async () => {
      const md = [
        '# Heading',
        'This colour is wrong and behaviour is odd.',
        'Please avoid Foo in headings.',
        'List:',
        '* item',
      ].join('\n');
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, md, 'utf8');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/composite-rule': {
            severity: 'error',
            message: 'Issue: %s',
            assertions: {
              swap: {
                ignoreCase: true,
                wordBoundary: true,
                pairs: { colour: 'color', behaviour: 'behavior' },
              },
              pattern: { ignoreCase: true, tokens: ['Foo'] },
            },
          },
        },
      });

      const report = completed(await runLint(tempDir, config, { severity: 'info' }));
      expect(errorsIn(report.problems).length).toBeGreaterThan(0);
      expect(report.problems).toHaveLength(3);
      expect(
        report.problems.every((problem) => problem.ruleName === 'recheck/composite-rule')
      ).toBe(true);
    });
  });

  describe('Unreadable files', () => {
    // chmod 000 doesn't stop root (or Windows) from reading the file, so the
    // unreadable-file setup can't be produced there — skip rather than
    // silently assert the wrong scenario.
    it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
      'reports stats over actually-linted files and notes the skipped count',
      async () => {
        await fs.writeFile(path.join(tempDir, 'ok.md'), '# Ok\nThis has a TODO item');
        await fs.writeFile(path.join(tempDir, 'other.md'), '# Other\nNothing to see');
        const unreadablePath = path.join(tempDir, 'unreadable.md');
        await fs.writeFile(unreadablePath, '# Secret\nTODO hidden');
        await fs.chmod(unreadablePath, 0o000);

        const config = await resolveConfig(tempDir, {
          rules: {
            'recheck/no-todos': {
              severity: 'warn',
              message: 'TODO found',
              assertions: { pattern: { tokens: ['TODO'] } },
            },
          },
        });

        const report = completed(await runLint(tempDir, config, {}));

        expect(errorsIn(report.problems)).toHaveLength(0); // warn severity — no errors
        expect(report.unreadableFiles).toEqual([unreadablePath]);

        // 3 markdown files were discovered but only 2 were actually linted —
        // stats/file totals must cover the linted set, not the requested one.
        expect(report.filesFound).toBe(3);
        expect(report.scannedFileCount).toBe(2);
        expect(report.problems.every((problem) => problem.file !== unreadablePath)).toBe(true);
      }
    );
  });

  describe('File targeting with path patterns', () => {
    it('should apply rules only to files matching appliesTo path patterns', async () => {
      // Create directory structure
      const docsDir = path.join(tempDir, 'docs');
      const configDir = path.join(docsDir, 'config');
      const apiDir = path.join(docsDir, 'api');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(configDir, { recursive: true });
      await fs.mkdir(apiDir, { recursive: true });

      // Create test files
      await fs.writeFile(path.join(configDir, 'settings.md'), '# Settings\nThis has a TODO item');
      await fs.writeFile(path.join(configDir, 'advanced.md'), '# Advanced\nAnother TODO here');
      await fs.writeFile(path.join(apiDir, 'endpoints.md'), '# Endpoints\nThis also has TODO');
      await fs.writeFile(path.join(docsDir, 'readme.md'), '# README\nTODO in readme');
      await fs.writeFile(path.join(tempDir, 'root.md'), '# Root\nTODO at root');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/config-only-todos': {
            severity: 'error',
            message: 'TODO found in config docs',
            appliesTo: ['docs/config/**'],
            assertions: { pattern: { tokens: ['TODO'] } },
          },
        },
      });

      const { problems } = completed(await runLint(tempDir, config, {}));

      expect(errorsIn(problems).length).toBeGreaterThan(0); // Should find errors

      // Should only find TODOs in config files, not api or root files
      expect(problems).toHaveLength(2);
      expect(problems.every((problem) => problem.file.includes('docs/config/'))).toBe(true);
    });

    it('should exclude files matching excludes path patterns', async () => {
      // Create directory structure
      const docsDir = path.join(tempDir, 'docs');
      const draftsDir = path.join(docsDir, 'drafts');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(draftsDir, { recursive: true });

      // Create test files
      await fs.writeFile(path.join(docsDir, 'guide.md'), '# Guide\nThis has TODO');
      await fs.writeFile(path.join(docsDir, 'tutorial.md'), '# Tutorial\nAnother TODO');
      await fs.writeFile(path.join(draftsDir, 'draft1.md'), '# Draft\nTODO in draft');
      await fs.writeFile(path.join(draftsDir, 'draft2.md'), '# Draft 2\nTODO in draft 2');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/no-todos': {
            severity: 'error',
            message: 'TODO found',
            excludes: ['docs/drafts/**'],
            assertions: { pattern: { tokens: ['TODO'] } },
          },
        },
      });

      const { problems } = completed(await runLint(tempDir, config, {}));

      expect(errorsIn(problems).length).toBeGreaterThan(0); // Should find errors

      // Should only find TODOs in main docs, not in drafts
      expect(problems).toHaveLength(2);
      expect(problems.every((problem) => !problem.file.includes('drafts/'))).toBe(true);
    });

    it('should support complex path patterns', async () => {
      // Create directory structure
      await fs.mkdir(path.join(tempDir, 'src', 'components'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'docs', 'api'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });

      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'src', 'components', 'button.md'),
        '# Button\nFIXME needed'
      );
      await fs.writeFile(path.join(tempDir, 'docs', 'api', 'auth.md'), '# Auth\nFIXME here too');
      await fs.writeFile(path.join(tempDir, 'tests', 'setup.md'), '# Tests\nNo FIXME here');
      await fs.writeFile(path.join(tempDir, 'README.md'), '# Project\nFIXME in readme');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/fixme-in-specific-dirs': {
            severity: 'error',
            message: 'FIXME found',
            appliesTo: ['**/components/**', '**/api/**'],
            assertions: { pattern: { tokens: ['FIXME'] } },
          },
        },
      });

      const { problems } = completed(await runLint(tempDir, config, {}));

      expect(errorsIn(problems).length).toBeGreaterThan(0); // Should find errors

      // Should only find FIXMEs in components and api directories
      expect(problems).toHaveLength(2);
      expect(problems.some((problem) => problem.file.includes('components/'))).toBe(true);
      expect(problems.some((problem) => problem.file.includes('api/'))).toBe(true);
      expect(problems.every((problem) => !problem.file.includes('README.md'))).toBe(true);
      expect(problems.every((problem) => !problem.file.includes('tests/'))).toBe(true);
    });

    it('should work with basename patterns (backward compatibility)', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'config.md'), '# Config\nTODO here');
      await fs.writeFile(path.join(tempDir, 'setup.config.md'), '# Setup Config\nTODO here too');
      await fs.writeFile(path.join(tempDir, 'readme.md'), '# README\nTODO in readme');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/config-files-only': {
            severity: 'error',
            message: 'TODO found in config file',
            appliesTo: ['*.config.md', 'config.md'],
            assertions: { pattern: { tokens: ['TODO'] } },
          },
        },
      });

      const { problems } = completed(await runLint(tempDir, config, {}));

      expect(errorsIn(problems).length).toBeGreaterThan(0); // Should find errors

      // Should only find TODOs in config files
      expect(problems).toHaveLength(2);
      expect(
        problems.every(
          (problem) =>
            problem.file.includes('config.md') || problem.file.includes('setup.config.md')
        )
      ).toBe(true);
    });
  });

  // `markdoc: true` in a real redocly.yaml recheck block did not used to
  // reach the runner through the CLI entry point, which left every
  // `recheck/markdoc-*` rule unreachable regardless of config. These go
  // through `runLint` rather than `lintContent`/`lintFiles`, so a
  // regression in the CLI-specific wiring fails here even if the
  // programmatic path stays green.
  describe('Markdoc flag threading (CLI gap closed)', () => {
    it('a markdoc rule fires via the command entry point when the config sets markdoc: true', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      // A missing required `type` attribute is only detectable at all when
      // `ctx.markdoc` is populated.
      await fs.writeFile(
        mdPath,
        '{% admonition %}\nMissing the required type attribute.\n{% /admonition %}\n'
      );

      const config = await resolveConfig(tempDir, { markdoc: true }, ['recheck/markdoc']);

      const { problems } = completed(await runLint(tempDir, config, {}));

      // A severity-error finding means exit code 1, so the rule really ran
      // rather than merely loading.
      expect(errorsIn(problems).length).toBeGreaterThan(0);
      expect(
        problems.some(
          (problem) =>
            problem.ruleName === 'recheck/markdoc-attributes' &&
            problem.message.includes('is missing its required')
        )
      ).toBe(true);
    });

    it('without markdoc: true, the identical tag content reports nothing (proves the flag -- not something else -- gates it)', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(
        mdPath,
        '{% admonition %}\nMissing the required type attribute.\n{% /admonition %}\n'
      );

      const config = await resolveConfig(tempDir, {}, ['recheck/markdoc']);
      expect(config.markdoc).toBe(false);

      const { problems } = completed(await runLint(tempDir, config, {}));
      expect(errorsIn(problems)).toHaveLength(0);

      // No errors alone cannot distinguish "the flag gated the rules" from
      // "the rules ran and found nothing on this fixture".
      expect(problems.some((problem) => problem.ruleName.startsWith('recheck/markdoc-'))).toBe(
        false
      );

      // The Markdoc rules are in the resolved config, so the silence above is
      // the flag gating them, not the rules being absent.
      expect(config.rules.some((rule) => rule.name === 'recheck/markdoc-attributes')).toBe(true);
    });
  });

  // A single run may cover several roots (e.g. `docs` and `reference`), so
  // both trees must reach one report and one exit code.
  describe('Several roots', () => {
    it('lints two directories in one call and exits on the worse of the two', async () => {
      const guides = path.join(tempDir, 'guides');
      const reference = path.join(tempDir, 'reference');
      await fs.mkdir(guides);
      await fs.mkdir(reference);
      await fs.writeFile(path.join(guides, 'guide.md'), '# Guide\nThis has a TODO item');
      await fs.writeFile(path.join(reference, 'api.md'), '# API\nThis has a FIXME item');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/no-todos': {
            severity: 'warn',
            message: 'TODO found',
            assertions: { pattern: { tokens: ['TODO'] } },
          },
          'recheck/no-fixmes': {
            severity: 'error',
            message: 'FIXME found',
            assertions: { pattern: { tokens: ['FIXME'] } },
          },
        },
      });

      const report = completed(await runLint([guides, reference], config, {}));

      // The warn-only root cannot mask the error root.
      expect(errorsIn(report.problems).length).toBeGreaterThan(0);

      expect(report.roots).toEqual([guides, reference]);
      expect(report.scannedFileCount).toBe(2);
      const reportedFiles = report.problems.map((problem) => problem.file);
      expect(reportedFiles.some((file) => file.includes('guide.md'))).toBe(true);
      expect(reportedFiles.some((file) => file.includes('api.md'))).toBe(true);
    });
  });
});

describe('runLint image metadata', () => {
  it('confines image lookups to the scanned root, not the working directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-image-root-'));
    try {
      await fs.writeFile(path.join(root, 'big.png'), Buffer.alloc(2048));
      await fs.writeFile(path.join(root, 'doc.md'), '# Doc\n\n![Big](./big.png)\n');
      const config = await resolveConfig(root, {
        rules: {
          'recheck/max-image-size': {
            severity: 'error',
            message: 'Image too large: %s',
            assertions: { 'max-image-size': { maxSizeKB: 1 } },
          },
        },
      });
      const { problems } = completed(await runLint(root, config, {}));
      expect(errorsIn(problems).length).toBeGreaterThan(0);
      expect(
        problems.some(
          (problem) =>
            problem.ruleName === 'recheck/max-image-size' && problem.message.includes('big.png')
        )
      ).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe('runLint result', () => {
  const tempDirs: string[] = [];

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-result-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('returns the run as data instead of printing it', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), `# Page\n\n${LONG_LINE}\n`);
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await runLint(dir, config, {});
    expect(result.status).toBe('completed');
    if (result.status !== 'completed') return;
    expect(result.roots).toEqual([dir]);
    expect(result.filesFound).toBe(1);
    expect(result.scannedFileCount).toBe(1);
    expect(result.empty).toBe(false);
    expect(result.problems.map((problem) => problem.ruleName)).toContain('recheck/line-length');
    expect(result.fixes).toBeUndefined();
    expect(result.baseline).toBeUndefined();
  });

  it('reports an unknown rule name as a result, not an exception', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), '# Page\n');
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await runLint(dir, config, { rules: ['recheck/no-such-rule'] });
    expect(result.status).toBe('unknown-rule');
    if (result.status !== 'unknown-rule') return;
    expect(result.available).toContain('recheck/line-length');
  });

  it('counts the rules that run and the rules that severity off disables', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), '# Page\n');
    const config = await resolveConfig(dir, {
      rules: {
        'recheck/no-todos': {
          severity: 'warn',
          message: 'TODO found',
          assertions: { pattern: { tokens: ['TODO'] } },
        },
        'recheck/muted-rule': {
          severity: 'off',
          message: 'Never fires',
          assertions: { pattern: { tokens: ['Page'] } },
        },
      },
    });
    const report = completed(await runLint(dir, config, {}));
    expect(report.ruleCount).toBe(1);
    expect(report.disabledRuleCount).toBe(1);
  });

  it('reports how many files the changed list kept', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'kept.md'), '# Kept\n');
    await fs.writeFile(path.join(dir, 'other.md'), '# Other\n');
    const changedListPath = path.join(dir, 'changed.txt');
    await fs.writeFile(changedListPath, `${path.join(dir, 'kept.md')}\n`);
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);

    const report = completed(await runLint(dir, config, { changedOnly: true, changedListPath }));
    expect(report.filesFound).toBe(2);
    expect(report.changedFilter).toEqual({ provided: true, matched: 1 });
    expect(report.scannedFileCount).toBe(1);

    const emptyListPath = path.join(dir, 'empty.txt');
    await fs.writeFile(emptyListPath, '');
    const unfiltered = completed(
      await runLint(dir, config, { changedOnly: true, changedListPath: emptyListPath })
    );
    expect(unfiltered.changedFilter).toEqual({ provided: false, matched: 0 });
    expect(unfiltered.empty).toBe(true);
  });

  it('suppresses baselined errors and reports the baseline counts', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), `# Page\n\n${LONG_LINE}\n`);
    await fs.writeFile(
      path.join(dir, '.redocly.recheck-baseline.yaml'),
      'version: 1\nfiles:\n  page.md:\n    recheck/line-length: 1\n'
    );
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const report = completed(await runLint(dir, config, {}));
    expect(report.baseline).toEqual({ matched: 1, new: 0, stale: 0 });
    expect(report.problems.map((problem) => problem.ruleName)).not.toContain('recheck/line-length');
  });

  it('reports a baseline file that disappears before the run', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), '# Page\n');
    const baselinePath = path.join(dir, '.redocly.recheck-baseline.yaml');
    await fs.writeFile(baselinePath, 'version: 1\nfiles: {}\n');
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    await fs.rm(baselinePath);
    const result = await runLint(dir, config, {});
    expect(result).toMatchObject({
      status: 'baseline-missing',
      baselinePath,
      report: { filesFound: 1, scannedFileCount: 1 },
    });
  });

  it('carries the fix report when the baseline file disappears before the run', async () => {
    const dir = await makeTempDir();
    const pagePath = path.join(dir, 'page.md');
    await fs.writeFile(pagePath, '# Page\nThis has trailing spaces   \nAnother line');
    const baselinePath = path.join(dir, '.redocly.recheck-baseline.yaml');
    await fs.writeFile(baselinePath, 'version: 1\nfiles: {}\n');
    const config = await resolveConfig(dir, {
      rules: {
        'recheck/no-trailing-spaces': {
          severity: 'error',
          message: 'No trailing spaces',
          assertions: { 'no-trailing-spaces': {} },
        },
      },
    });
    expect(config.baselinePath).toBe(baselinePath);
    await fs.rm(baselinePath);

    const result = await runLint(dir, config, { fix: true });
    expect(result.status).toBe('baseline-missing');
    if (result.status !== 'baseline-missing') return;
    expect(result.report.fixes?.applied.length).toBeGreaterThan(0);
    expect(await fs.readFile(pagePath, 'utf8')).toBe(
      '# Page\nThis has trailing spaces\nAnother line'
    );
  });

  it('reports an engine error as a failed result', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, 'page.md'), '# Page\n');
    await fs.writeFile(path.join(dir, '.redocly.recheck-baseline.yaml'), 'version: 2\n');
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const result = await runLint(dir, config, {});
    expect(result.status).toBe('failed');
    if (result.status !== 'failed') return;
    expect(result.message).toContain('unsupported version 2');
  });
});
