import { createConfig, logger, type Config } from '@redocly/openapi-core';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { handleRecheck } from '../index.js';

function fakeConfig(recheck: unknown, recheckExtends: string[] | undefined, dir: string): Config {
  return {
    configPath: join(dir, 'redocly.yaml'),
    resolvedConfig: { recheck, recheckExtends },
  } as unknown as Config;
}

const createdDirs: string[] = [];

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'recheck-cmd-'));
  createdDirs.push(dir);
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'docs', 'clean.md'), '# Title\n\nOne sentence.\n');
  return dir;
}

describe('handleRecheck', () => {
  let out: string[];
  let err: string[];
  beforeEach(() => {
    out = [];
    err = [];
    vi.spyOn(logger, 'output').mockImplementation((s: string) => void out.push(s) as never);
    vi.spyOn(logger, 'info').mockImplementation((s: string) => void err.push(s) as never);
    vi.spyOn(logger, 'warn').mockImplementation((s: string) => void err.push(s) as never);
    vi.spyOn(logger, 'error').mockImplementation((s: string) => void err.push(s) as never);
    process.exitCode = undefined;
  });

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lints markdown from the recheck block and presets, table on stdout', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    expect(out.join('')).toContain('No issues found');
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('falls back to recheck/markdown with a notice when nothing is configured', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig(undefined, undefined, dir),
    } as never);
    expect(err.join('')).toContain('No recheck configuration found; using recheck/markdown.');
  });

  it('falls back to recheck/markdown with a notice when the block is null', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig(null, undefined, dir),
    } as never);
    expect(err.join('')).toContain('No recheck configuration found; using recheck/markdown.');
  });

  it('reports config errors on stderr and exits 1', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig({ extends: ['recheck/markdown'] }, undefined, dir),
    } as never);
    expect(err.join('')).toContain('root `extends`');
    expect(process.exitCode).toBe(1);
  });

  // A single unbroken word never trips `recheck/line-length` (the rule collapses a
  // line's trailing non-whitespace run before measuring length); use wrappable
  // multi-word content instead, matching packages/recheck's own embedded-lint tests.
  const LONG = 'lorem ipsum dolor sit amet '.repeat(6).trim();
  const API = `openapi: 3.1.0\ninfo:\n  title: t\n  version: "1"\n  description: |\n    Intro.\n    ${LONG}\npaths: {}\n`;

  async function realConfig(dir: string, raw: Record<string, unknown>) {
    return createConfig(raw, { configPath: join(dir, 'redocly.yaml') });
  }

  it('lints an explicit API description path at its source position', async () => {
    const dir = fixture();
    writeFileSync(join(dir, 'openapi.yaml'), API);
    const config = await realConfig(dir, { extends: ['recheck/markdown'] });
    await handleRecheck({
      argv: { paths: [join(dir, 'openapi.yaml')], format: 'json' },
      config,
    } as never);
    const report = JSON.parse(out.join(''));
    const finding = report.issues.find(
      (issue: { ruleName: string }) => issue.ruleName === 'recheck/line-length'
    );
    expect(finding.file).toBe(join(dir, 'openapi.yaml'));
    expect(finding.line).toBe(7);
    expect(finding.pointer).toBe('#/info/description');
    expect(process.exitCode).toBe(1);
  });

  it('lints every API in apis when no paths are given', async () => {
    const dir = fixture();
    writeFileSync(join(dir, 'openapi.yaml'), API);
    const config = await realConfig(dir, {
      extends: ['recheck/markdown'],
      apis: { main: { root: './openapi.yaml' } },
    });
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await handleRecheck({ argv: { format: 'json' }, config } as never);
    } finally {
      process.chdir(cwd);
    }
    const report = JSON.parse(out.join(''));
    expect(
      report.issues.some((issue: { file: string }) => issue.file.endsWith('openapi.yaml'))
    ).toBe(true);
  });

  it('suppresses a description finding listed in the ignore file', async () => {
    const dir = fixture();
    writeFileSync(join(dir, 'openapi.yaml'), API);
    const config = await realConfig(dir, { extends: ['recheck/markdown'] });
    config.ignore[join(dir, 'openapi.yaml')] = {
      'recheck/line-length': new Set(['#/info/description']),
    };
    await handleRecheck({
      argv: { paths: [join(dir, 'openapi.yaml')], format: 'json' },
      config,
    } as never);
    const report = JSON.parse(out.join(''));
    expect(report.issues).toHaveLength(0);
    expect(err.join('')).toContain('1 finding(s) suppressed by the ignore file');
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('skips API descriptions for readability with one notice', async () => {
    const dir = fixture();
    writeFileSync(join(dir, 'openapi.yaml'), API);
    const config = await realConfig(dir, { extends: ['recheck/markdown'] });
    await handleRecheck({
      argv: { paths: [join(dir, 'openapi.yaml')], format: 'table', readability: true },
      config,
    } as never);
    expect(err.join('')).toContain(
      'Readability scores cover Markdown files only; skipped 1 API description(s).'
    );
  });

  it('rejects conflicting action flags', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [dir], format: 'table', readability: true, 'generate-baseline': true },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    expect(err.join('')).toContain('Use one of --readability');
    expect(process.exitCode).toBe(1);
  });

  it('runs readability and writes the JSON report to stdout', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'json', readability: true },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    const report = JSON.parse(out.join(''));
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('files');
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('generates a baseline file next to the config', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table', 'generate-baseline': true },
      config: fakeConfig(
        { rules: {}, baseline: './recheck-baseline.yaml' },
        ['recheck/markdown'],
        dir
      ),
    } as never);
    expect(existsSync(join(dir, 'recheck-baseline.yaml'))).toBe(true);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('generates a Markdoc schema without resolving the recheck config', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: {
        paths: [dir],
        format: 'table',
        'generate-markdoc-schema': true,
        from: [join(dir, 'missing-theme.ts')],
        out: join(dir, 'schema.yaml'),
      },
      config: fakeConfig({ extends: ['recheck/markdown'] }, undefined, dir),
    } as never);
    expect(err.join('')).not.toContain('The recheck configuration is not valid');
    expect(err.join('')).toContain('could not import');
    expect(process.exitCode).toBe(1);
  });

  it('writes only the JSON report to stdout for --format json', async () => {
    const dir = fixture();
    writeFileSync(join(dir, 'docs', 'index.md'), '# Title\n\n# Second title\n');
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'json' },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    expect(() => JSON.parse(out.join(''))).not.toThrow();
    expect(err.join('')).toContain('Running recheck on');
  });

  it('warns and skips the file when --output-path is used with a non-json, non-sarif format', async () => {
    const dir = fixture();
    const outputPath = join(dir, 'report.txt');
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table', 'output-path': outputPath },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    expect(err.join('')).toContain(
      '--output-path applies to --format json and sarif; the report goes to stdout.'
    );
    expect(existsSync(outputPath)).toBe(false);
  });
});
