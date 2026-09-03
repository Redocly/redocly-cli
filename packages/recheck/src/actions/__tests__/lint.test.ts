import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
import { runLint } from '../lint.js';
import { collectingLogger } from '../logger.js';

/** Builds a resolved config from block/extends data, the same shape a recheck.yaml
 *  root key would carry, without writing anything to disk. */
async function resolveConfig(
  configDir: string,
  block: Record<string, unknown> = {},
  extendsList?: string[]
): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({ extends: extendsList, block, configDir });
  if (!result.success) {
    throw new Error(
      `config resolution failed: ${result.errors.map((error) => error.message).join('; ')}`
    );
  }
  return result.config;
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
      const logger = collectingLogger();
      const exitCode = await runLint(emptyDir, config, {}, logger);

      expect(exitCode).toBe(0); // Succeeds when no markdown files are found
      expect(logger.lines.some((log) => log.includes('No markdown files found'))).toBe(true);
    });
  });

  describe('Output format error handling', () => {
    it('should handle file write errors for output-path', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nSome content');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/test-rule': {
            severity: 'warn',
            message: 'Test message',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      // Try to write to a nonexistent directory
      const invalidOutputPath = path.join(tempDir, 'nonexistent', 'output.json');

      const logger = collectingLogger();
      const exitCode = await runLint(
        tempDir,
        config,
        { format: 'json', outputPath: invalidOutputPath },
        logger
      );

      expect(exitCode).toBe(1); // The important part - it should fail with exit code 1
      // The write failure surfaces through logger.errors, not logger.lines.
    });

    it.skip('should write table format to file when output-path specified', () => {
      // Table output to file is not currently supported - only logger output
    });

    it('should write JSON format to file when output-path specified', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nSome content');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/test-rule': {
            severity: 'error',
            message: 'JSON test',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      const outputPath = path.join(tempDir, 'output.json');

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json', outputPath }, logger);

      expect(exitCode).toBe(1);

      const outputContent = await fs.readFile(outputPath, 'utf8');
      const parsed = JSON.parse(outputContent);
      expect(parsed.summary.totalIssues).toBe(1);
      expect(parsed.issues[0].message).toBe('JSON test');
    });

    it('should write SARIF format to file when output-path specified', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nSome content');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/test-rule': {
            severity: 'error',
            message: 'SARIF test',
            assertions: { pattern: { tokens: ['content'] } },
          },
        },
      });

      const outputPath = path.join(tempDir, 'output.sarif');

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'sarif', outputPath }, logger);

      expect(exitCode).toBe(1);

      const outputContent = await fs.readFile(outputPath, 'utf8');
      const parsed = JSON.parse(outputContent);
      expect(parsed.runs[0].results).toHaveLength(1);
      expect(parsed.runs[0].results[0].message.text).toBe('SARIF test');
    });

    it.skip('should write GitHub Actions format to file when output-path specified', () => {
      // GitHub Actions output to file may not be supported - mainly for logger output
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, {}, logger);

      expect(exitCode).toBe(0); // No errors because no markdown files found
      expect(logger.lines.some((log) => log.includes('No markdown files found'))).toBe(true);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, {}, logger);

      expect(exitCode).toBe(0); // No issues found in empty file
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, {}, logger);

      expect(exitCode).toBe(0); // directive warnings are warn-severity, not errors
      expect(logger.lines.some((log) => log.includes('unknown rule "no-such-rule"'))).toBe(true);
      expect(logger.lines.some((log) => log.includes('unknown rule "muted-rule"'))).toBe(false);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { fix: true }, logger);

      expect(exitCode).toBe(1); // Still reports original issues even after fixing
      expect(logger.lines.some((log) => log.includes('Auto-fixed'))).toBe(true);

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

      const logger = collectingLogger();
      await runLint(tempDir, config, { fix: true }, logger);

      const fixedContent = await fs.readFile(mdPath, 'utf8');
      expect(fixedContent).toBe('- bullet one\n');

      // 4 fixes are PROPOSED across passes (pass 1's no-trailing-spaces
      // fix conflicts with no-hard-tabs' and is skipped, then re-proposed
      // and applied in pass 2) but only 3 ever land — the report must show
      // the true count, not every proposal.
      expect(logger.lines.some((log) => log.includes('Auto-fixed 3 issue(s)'))).toBe(true);
      // The skipped-then-reapplied fix converged, so no warning is due.
      expect(logger.lines.some((log) => log.includes('could not be applied'))).toBe(false);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { fix: true }, logger);

      expect(exitCode).toBe(1); // Still has unfixable errors
      expect(logger.lines.some((log) => log.includes('No auto-fixable issues found'))).toBe(true);
    });
  });

  describe('Summary and SARIF output', () => {
    it('writes JSON summary to file', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\nThis is a test');

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/no-gerunds': {
            severity: 'warn',
            message: 'Avoid gerunds',
            assertions: { pattern: { tokens: ['is a test'] } },
          },
        },
      });

      const summaryPath = path.join(tempDir, 'summary.json');

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { summary: 'json', summaryPath }, logger);
      expect(exitCode).toBe(0);

      const summaryContent = await fs.readFile(summaryPath, 'utf8');
      const summary = JSON.parse(summaryContent);

      expect(summary.totalIssues).toBe(1);
      expect(summary.totalWarnings).toBe(1);
      expect(summary.breakdown['recheck/no-gerunds'].total).toBe(1);
    });

    it('caps SARIF results with annotations-limit', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(mdPath, '# Test\n' + 'bad sentence. '.repeat(5));

      const config = await resolveConfig(tempDir, {
        rules: {
          'recheck/bad-sentence': {
            severity: 'error',
            message: 'Bad',
            assertions: { pattern: { tokens: ['bad sentence'] } },
          },
        },
      });
      const outputPath = path.join(tempDir, 'report.sarif');

      const logger = collectingLogger();
      const exitCode = await runLint(
        tempDir,
        config,
        { format: 'sarif', outputPath, annotationsLimit: 2 },
        logger
      );
      expect(exitCode).toBe(1);

      const sarifContent = await fs.readFile(outputPath, 'utf8');
      const sarif = JSON.parse(sarifContent);

      expect(sarif.runs[0].results).toHaveLength(2);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json', severity: 'info' }, logger);
      expect(exitCode).toBe(1);
      const jsonBlock = logger.lines.find((line) => line.trim().startsWith('{'));
      expect(jsonBlock).toBeTruthy();
      const report = JSON.parse(jsonBlock as string);
      expect(report.summary.totalIssues).toBe(3);
      expect(report.summary.breakdown['recheck/composite-rule'].total).toBe(3);
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

        const outputPath = path.join(tempDir, 'report.json');
        const summaryPath = path.join(tempDir, 'summary.json');

        const logger = collectingLogger();
        const exitCode = await runLint(
          tempDir,
          config,
          { format: 'json', outputPath, summary: 'json', summaryPath },
          logger
        );

        expect(exitCode).toBe(0); // warn severity — no errors
        // The pre-existing per-file warning still appears...
        expect(logger.lines.some((log) => log.includes('Could not read file'))).toBe(true);
        // ...plus a one-line note with the skipped count.
        expect(logger.lines.some((log) => log.includes('Skipped 1 unreadable file'))).toBe(true);

        // 3 markdown files were discovered but only 2 were actually linted —
        // stats/file totals must cover the linted set, not the requested one.
        const report = JSON.parse(await fs.readFile(outputPath, 'utf8'));
        expect(report.summary.filesScanned).toBe(2);
        const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
        expect(summary.filesScanned).toBe(2);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json' }, logger);

      expect(exitCode).toBe(1); // Should find errors

      // Extract JSON output
      const jsonLine = logger.lines.find((log) => log.trim().startsWith('{'));
      expect(jsonLine).toBeTruthy();
      const report = JSON.parse(jsonLine as string);

      // Should only find TODOs in config files, not api or root files
      expect(report.summary.totalIssues).toBe(2);
      expect(report.issues).toHaveLength(2);
      expect(report.issues.every((issue: any) => issue.file.includes('docs/config/'))).toBe(true);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json' }, logger);

      expect(exitCode).toBe(1); // Should find errors

      // Extract JSON output
      const jsonLine = logger.lines.find((log) => log.trim().startsWith('{'));
      expect(jsonLine).toBeTruthy();
      const report = JSON.parse(jsonLine as string);

      // Should only find TODOs in main docs, not in drafts
      expect(report.summary.totalIssues).toBe(2);
      expect(report.issues).toHaveLength(2);
      expect(report.issues.every((issue: any) => !issue.file.includes('drafts/'))).toBe(true);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json' }, logger);

      expect(exitCode).toBe(1); // Should find errors

      // Extract JSON output
      const jsonLine = logger.lines.find((log) => log.trim().startsWith('{'));
      expect(jsonLine).toBeTruthy();
      const report = JSON.parse(jsonLine as string);

      // Should only find FIXMEs in components and api directories
      expect(report.summary.totalIssues).toBe(2);
      expect(report.issues).toHaveLength(2);
      expect(report.issues.some((issue: any) => issue.file.includes('components/'))).toBe(true);
      expect(report.issues.some((issue: any) => issue.file.includes('api/'))).toBe(true);
      expect(report.issues.every((issue: any) => !issue.file.includes('README.md'))).toBe(true);
      expect(report.issues.every((issue: any) => !issue.file.includes('tests/'))).toBe(true);
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

      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json' }, logger);

      expect(exitCode).toBe(1); // Should find errors

      // Extract JSON output
      const jsonLine = logger.lines.find((log) => log.trim().startsWith('{'));
      expect(jsonLine).toBeTruthy();
      const report = JSON.parse(jsonLine as string);

      // Should only find TODOs in config files
      expect(report.summary.totalIssues).toBe(2);
      expect(report.issues).toHaveLength(2);
      expect(
        report.issues.every(
          (issue: any) => issue.file.includes('config.md') || issue.file.includes('setup.config.md')
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

      const outputPath = path.join(tempDir, 'output.json');
      const logger = collectingLogger();
      const exitCode = await runLint(tempDir, config, { format: 'json', outputPath }, logger);

      // A severity-error finding means exit code 1, so the rule really ran
      // rather than merely loading.
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      expect(
        parsed.issues.some(
          (issue: any) =>
            issue.ruleName === 'recheck/markdoc-attributes' &&
            issue.message.includes('is missing its required')
        )
      ).toBe(true);
    });

    it('without markdoc: true, the identical tag content reports nothing (proves the flag -- not something else -- gates it)', async () => {
      const mdPath = path.join(tempDir, 'doc.md');
      await fs.writeFile(
        mdPath,
        '{% admonition %}\nMissing the required type attribute.\n{% /admonition %}\n'
      );

      // Extending `recheck/markdoc` without `markdoc: true` must warn on this
      // path too. The warning is forwarded from config resolution into the
      // same logger runLint reports through.
      const logger = collectingLogger();
      const result = await resolveRecheckConfig({
        extends: ['recheck/markdoc'],
        configDir: tempDir,
        warn: logger.warn,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;

      const exitCode = await runLint(tempDir, result.config, { format: 'json' }, logger);
      expect(exitCode).toBe(0);

      // An exit code alone cannot distinguish "the flag gated the rules" from
      // "the rules ran and found nothing on this fixture".
      const jsonLine = logger.lines.find((log) => log.trim().startsWith('{'));
      expect(jsonLine).toBeTruthy();
      const report = JSON.parse(jsonLine as string);
      expect(
        report.issues.some((issue: any) =>
          (issue.ruleName as string).startsWith('recheck/markdoc-')
        )
      ).toBe(false);

      // The warning firing confirms the silence above is the flag gating the
      // rules, not the whole check being skipped.
      expect(
        logger.warnings.some((message) =>
          message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
        )
      ).toBe(true);
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

      const outputPath = path.join(tempDir, 'report.json');
      const logger = collectingLogger();
      const exitCode = await runLint(
        [guides, reference],
        config,
        { format: 'json', outputPath },
        logger
      );

      // The warn-only root cannot mask the error root.
      expect(exitCode).toBe(1);

      const report = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      expect(report.summary.filesScanned).toBe(2);
      const reportedFiles = report.issues.map((issue: any) => issue.file);
      expect(reportedFiles.some((file: string) => file.includes('guide.md'))).toBe(true);
      expect(reportedFiles.some((file: string) => file.includes('api.md'))).toBe(true);
    });
  });
});
