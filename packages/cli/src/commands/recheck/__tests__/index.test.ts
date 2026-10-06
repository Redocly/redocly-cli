import { AbortFlowError, createConfig, type Config } from '@redocly/openapi-core';
import type { RecheckBlock } from '@redocly/recheck';
import { recheckPresetsPlugin } from '@redocly/recheck/presets';
import { cyan } from 'colorette';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { outdent } from 'outdent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configFixture } from '../../../__tests__/fixtures/config.js';
import { handleRecheck } from '../index.js';
import type { RecheckArgv } from '../types.js';
import { captureLogger } from './capture-logger.js';

const NO_CONFIG_NOTICE =
  'No recheck configuration in redocly.yaml; nothing to check. Add a recheck/* preset to extends or a recheck block.\n';
const PER_API_WARNING =
  'Recheck settings under apis.main are not used; the command reads the root config.\n';

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

  function run(
    recheck: RecheckBlock,
    configPath: string | undefined,
    parsed?: unknown
  ): Promise<void> {
    const argv: RecheckArgv = {
      format: 'table',
      paths: [path.join(dir, 'docs')],
    };
    const document = parsed === undefined ? undefined : { parsed };
    const config = {
      ...configFixture,
      recheck,
      configPath,
      document,
    } as Config;
    return handleRecheck({ argv, config, version: 'test' });
  }

  it('runs the rules of a preset from the root extends', async () => {
    const config = await createConfig(
      { extends: ['recheck/markdown'] },
      { configPath: path.join(dir, 'redocly.yaml'), plugins: [recheckPresetsPlugin] }
    );
    const argv: RecheckArgv = { format: 'table', paths: [path.join(dir, 'docs')] };
    await expect(handleRecheck({ argv, config, version: 'test' })).rejects.toThrow(AbortFlowError);
    const report = output.stdout.join('');
    expect(report).toContain('single-h1');
    expect(report).toContain('blanks-around-headings');
  });

  it('runs only the rules of the block', async () => {
    const rules = {
      'recheck/single-h1': {
        severity: 'error' as const,
        assertions: { 'single-h1': {} },
      },
    };
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

  it('checks nothing when `rules` is null and the block has no settings', async () => {
    const block = { rules: null } as unknown as RecheckBlock;
    await run(block, path.join(dir, 'redocly.yaml'));
    expect(output.stderr).toEqual([NO_CONFIG_NOTICE]);
    expect(output.stdout).toEqual([]);
  });

  it('reports a block that is not an object', async () => {
    const block = 5 as unknown as RecheckBlock;
    await expect(run(block, path.join(dir, 'redocly.yaml'))).rejects.toThrow(AbortFlowError);
    expect(output.stderr).toEqual([
      'The recheck configuration is not valid:\n',
      '  recheck: `recheck` must be an object\n',
    ]);
  });

  describe('run options', () => {
    async function runWith(argvOverrides: Partial<RecheckArgv>): Promise<void> {
      const argv: RecheckArgv = {
        format: 'table',
        paths: [path.join(dir, 'docs')],
        ...argvOverrides,
      };
      const config = await createConfig(
        { extends: ['recheck/markdown'] },
        { configPath: path.join(dir, 'redocly.yaml'), plugins: [recheckPresetsPlugin] }
      );
      return handleRecheck({ argv, config, version: 'test' });
    }

    it('runs only the rules named by --rule', async () => {
      await expect(runWith({ rule: ['single-h1'] })).rejects.toThrow(AbortFlowError);
      const report = output.stdout.join('');
      expect(report).toContain('single-h1');
      expect(report).not.toContain('blanks-around-headings');
    });

    it('skips the rules named by --skip-rule', async () => {
      await expect(runWith({ 'skip-rule': ['single-h1'] })).rejects.toThrow(AbortFlowError);
      const report = output.stdout.join('');
      expect(report).toContain('blanks-around-headings');
      expect(report).not.toContain('single-h1');
    });

    it('rewrites the files and reports the fixes with --fix', async () => {
      const file = path.join(dir, 'docs', 'index.md');
      // The run still reports the findings it fixed, so it exits 1.
      await expect(runWith({ fix: true, rule: ['blanks-around-headings'] })).rejects.toThrow(
        AbortFlowError
      );
      expect(await fs.readFile(file, 'utf8')).toBe('# One\n\n# Two\n');
      expect(output.stderr.join('')).toContain('Auto-fixed');
    });

    it('fails the run with the engine message for an unknown --rule', async () => {
      await expect(runWith({ rule: ['no-such-rule'] })).rejects.toThrow(AbortFlowError);
      expect(output.stderr.join('')).toContain(
        'no rule in this configuration matches "no-such-rule"'
      );
    });

    it('skips the descriptions of a remote $ref file and counts them', async () => {
      const apiPath = path.join(dir, 'openapi.yaml');
      await fs.writeFile(
        apiPath,
        outdent`
          openapi: 3.1.0
          info:
            title: Cafe
            version: 1.0.0
            description: Welcome to the cafe.
          paths: {}
          components:
            schemas:
              Order:
                $ref: https://example.com/schemas.yaml#/Order
        `
      );
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Order:\n  type: object\n  description: An order for one drink.\n')
      );

      await runWith({ paths: [apiPath] });

      expect(output.stderr).toContain(
        'Skipped 1 description(s) in remote $ref files; only local files are linted.\n'
      );
      expect(output.stderr).toContain(`${cyan('🏃 Running recheck on: 1 API description(s)')}\n`);
    });

    // The e2e snapshots show the message but not the exit code.
    it.each<[string, Partial<RecheckArgv>]>([
      ['lint', {}],
      ['baseline', { 'generate-baseline': true }],
    ])('fails the %s run when an API description does not parse', async (_action, argv) => {
      const apiPath = path.join(dir, 'broken.yaml');
      await fs.writeFile(apiPath, 'title: [t');
      await expect(runWith({ paths: [apiPath], ...argv })).rejects.toThrow(AbortFlowError);
      expect(output.stderr.join('')).toContain(`Could not read API description ${apiPath}`);
    });

    it('applies the baseline file next to redocly.yaml once generated', async () => {
      await runWith({ 'generate-baseline': true });
      expect(await fs.readFile(path.join(dir, '.redocly.recheck-baseline.yaml'), 'utf8')).toContain(
        'recheck/single-h1'
      );
      output.stderr.length = 0;
      await expect(runWith({})).resolves.toBeUndefined();
      expect(output.stderr.join('')).toMatch(/Baseline: \d+ matched, 0 new, 0 stale/);
    });
  });

  describe('per-API recheck settings', () => {
    const SETTINGS_ONLY: RecheckBlock = { rules: {}, excludes: ['**/skip.md'] };

    function runWithApi(api: Record<string, unknown>): Promise<void> {
      const parsed = { apis: { main: { root: 'openapi.yaml', ...api } } };
      return run(SETTINGS_ONLY, path.join(dir, 'redocly.yaml'), parsed);
    }

    it('warns once about a recheck block under an API', async () => {
      await runWithApi({ recheck: { rules: {} } });
      expect(output.stderr.filter((line) => line === PER_API_WARNING)).toHaveLength(1);
    });

    it('warns about a recheck preset in the extends of an API', async () => {
      await runWithApi({ extends: ['recheck/markdown'] });
      expect(output.stderr.filter((line) => line === PER_API_WARNING)).toHaveLength(1);
    });

    it('warns about a per-API preset when the root config has no recheck settings', async () => {
      const parsed = {
        apis: { main: { root: 'openapi.yaml', extends: ['recheck/markdown'] } },
      };
      await run({ rules: {} }, path.join(dir, 'redocly.yaml'), parsed);
      expect(output.stderr).toEqual([PER_API_WARNING, NO_CONFIG_NOTICE]);
      expect(output.stdout).toEqual([]);
    });

    it('does not warn about an API with no recheck settings', async () => {
      await runWithApi({ extends: ['recommended'] });
      expect(output.stderr.join('')).not.toContain('Recheck settings under apis.');
    });
  });
});
