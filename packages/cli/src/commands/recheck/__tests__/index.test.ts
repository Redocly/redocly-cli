import { AbortFlowError, type Config } from '@redocly/openapi-core';
import { presetBlocks, type RecheckBlock } from '@redocly/recheck';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configFixture } from '../../../__tests__/fixtures/config.js';
import { handleRecheck } from '../index.js';
import type { RecheckArgv } from '../types.js';
import { captureLogger } from './capture-logger.js';

const NO_CONFIG_NOTICE =
  'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.\n';

// Two adjacent top-level headings break `single-h1` and `blanks-around-headings`.
const DOCUMENT = '# One\n# Two\n';

describe('handleRecheck', () => {
  let dir: string;
  let output: { stderr: string[]; stdout: string[] };

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-handler-'));
    await fs.mkdir(path.join(dir, 'docs'));
    await fs.writeFile(path.join(dir, 'docs', 'index.md'), DOCUMENT);
    output = captureLogger();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(dir, { recursive: true, force: true });
  });

  function run(recheck: RecheckBlock, configPath: string | undefined): Promise<void> {
    const argv: RecheckArgv = { format: 'table', paths: [path.join(dir, 'docs')] };
    const config = { ...configFixture, recheck, configPath } as Config;
    return handleRecheck({ argv, config, version: 'test' });
  }

  it('runs the rules of a preset merged into the block', async () => {
    await expect(
      run({ rules: presetBlocks.markdown.rules }, path.join(dir, 'redocly.yaml'))
    ).rejects.toThrow(AbortFlowError);
    const report = output.stdout.join('');
    expect(report).toContain('single-h1');
    expect(report).toContain('blanks-around-headings');
  });

  it('runs only the rules of the block', async () => {
    const rules = { 'recheck/single-h1': presetBlocks.markdown.rules!['recheck/single-h1'] };
    await expect(run({ rules }, path.join(dir, 'redocly.yaml'))).rejects.toThrow(AbortFlowError);
    const report = output.stdout.join('');
    expect(report).toContain('single-h1');
    expect(report).not.toContain('blanks-around-headings');
  });

  it('runs a block that has settings and no rules', async () => {
    await run({ rules: {}, excludes: ['**/skip.md'] }, path.join(dir, 'redocly.yaml'));
    expect(output.stderr).not.toContain(NO_CONFIG_NOTICE);
    expect(output.stderr.join('')).toContain('Running 0 rule(s)');
  });

  it('checks nothing when redocly.yaml has no recheck configuration', async () => {
    await run({ rules: {} }, path.join(dir, 'redocly.yaml'));
    expect(output.stderr).toEqual([NO_CONFIG_NOTICE]);
    expect(output.stdout).toEqual([]);
  });

  it('uses recheck/markdown when there is no redocly.yaml', async () => {
    await expect(run({ rules: {} }, undefined)).rejects.toThrow(AbortFlowError);
    expect(output.stderr[0]).toBe('No redocly.yaml found; using recheck/markdown.\n');
    const report = output.stdout.join('');
    expect(report).toContain('single-h1');
    expect(report).toContain('blanks-around-headings');
  });

  it('reports a `rules` value that is not an object', async () => {
    const block = { rules: null } as unknown as RecheckBlock;
    await expect(run(block, path.join(dir, 'redocly.yaml'))).rejects.toThrow(AbortFlowError);
    expect(output.stderr).toEqual([
      'The recheck configuration is not valid:\n',
      '  recheck.rules: `recheck.rules` must be an object\n',
    ]);
  });

  it('reports a block that is not an object', async () => {
    const block = 5 as unknown as RecheckBlock;
    await expect(run(block, path.join(dir, 'redocly.yaml'))).rejects.toThrow(AbortFlowError);
    expect(output.stderr).toEqual([
      'The recheck configuration is not valid:\n',
      '  recheck: `recheck` must be an object\n',
    ]);
  });
});
