import { logger, type Config } from '@redocly/openapi-core';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleRecheck } from '../index.js';

function fakeConfig(recheck: unknown, recheckExtends: string[] | undefined, dir: string): Config {
  return {
    configPath: join(dir, 'redocly.yaml'),
    resolvedConfig: { recheck, recheckExtends },
  } as unknown as Config;
}

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'recheck-cmd-'));
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

  it('reports config errors on stderr and exits 1', async () => {
    const dir = fixture();
    await handleRecheck({
      argv: { paths: [join(dir, 'docs')], format: 'table' },
      config: fakeConfig({ extends: ['recheck/markdown'] }, undefined, dir),
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
      config: fakeConfig({ rules: {} }, ['recheck/markdown'], dir),
    } as never);
    expect(err.join('')).toContain('API descriptions are linted from the next release; skipped');
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
});
