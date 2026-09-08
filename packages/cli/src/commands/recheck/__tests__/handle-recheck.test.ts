import { logger, type Config } from '@redocly/openapi-core';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { handleRecheck } from '../index.js';

function fakeConfig(
  recheck: unknown,
  recheckExtends: string[] | undefined,
  configPath: string | undefined
): Config {
  return {
    configPath,
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
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
    } as never);
    expect(out.join('')).toContain('No issues found');
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('falls back to recheck/markdown with a notice when there is no redocly.yaml', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig(undefined, undefined, undefined),
    } as never);
    expect(err.join('')).toContain('No redocly.yaml found; using recheck/markdown.');
    expect(out.join('')).toContain('No issues found');
  });

  it('reports nothing to check when redocly.yaml has no recheck configuration', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig(undefined, undefined, join(dir, 'redocly.yaml')),
    } as never);
    expect(err.join('')).toContain(
      'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.'
    );
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('reports config errors on stderr and exits 1', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig({ extends: ['recheck/markdown'] }, undefined, join(dir, 'redocly.yaml')),
    } as never);
    expect(err.join('')).toContain('root `extends`');
    expect(process.exitCode).toBe(1);
  });

  it('skips an API description with a notice', async () => {
    const dir = fixture();
    writeFileSync(
      join(dir, 'openapi.yaml'),
      'openapi: 3.1.0\ninfo:\n  title: t\n  version: 1\npaths: {}\n'
    );
    await handleRecheck({
      argv: { paths: [join(dir, 'openapi.yaml'), join(dir, 'docs')], format: 'table' },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
    } as never);
    expect(err.join('')).toContain('API descriptions are linted from the next release; skipped');
  });

  it('rejects conflicting action flags', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [dir], format: 'table', readability: true, 'generate-baseline': true },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
    } as never);
    expect(err.join('')).toContain('Use one of --readability');
    expect(process.exitCode).toBe(1);
  });

  it('runs readability and writes the JSON report to stdout', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'json', readability: true },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
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
        join(dir, 'redocly.yaml')
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
      config: fakeConfig({ extends: ['recheck/markdown'] }, undefined, join(dir, 'redocly.yaml')),
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
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
    } as never);
    expect(() => JSON.parse(out.join(''))).not.toThrow();
    expect(err.join('')).toContain('Running recheck on');
  });

  it('warns and skips the file when --output-path is used with a non-json, non-sarif format', async () => {
    const dir = fixture();
    const outputPath = join(dir, 'report.txt');
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table', 'output-path': outputPath },
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], join(dir, 'redocly.yaml')),
    } as never);
    expect(err.join('')).toContain(
      '--output-path applies to --format json and sarif; the report goes to stdout.'
    );
    expect(existsSync(outputPath)).toBe(false);
  });
});
