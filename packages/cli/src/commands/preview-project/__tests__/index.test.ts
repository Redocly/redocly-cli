import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandArgs } from '../../../wrapper.js';
import { previewProject, resolveProjectDir } from '../index.js';
import type { PreviewProjectArgv } from '../types.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({ on: vi.fn() })),
}));

const run = (argv: Partial<PreviewProjectArgv>) =>
  previewProject({
    argv: { plan: 'enterprise', 'project-dir': '.', ...argv },
  } as CommandArgs<PreviewProjectArgv>);

const spawnedArgs = () => vi.mocked(spawn).mock.calls[0]?.[1] as string[];
const spawnedOptions = () => vi.mocked(spawn).mock.calls[0]?.[2] as { cwd?: string };

// A package root as the current directory, with a subdirectory the command was invoked from.
let packageRoot: string;
let invocationDir: string;

beforeEach(() => {
  vi.clearAllMocks();
  packageRoot = mkdtempSync(join(tmpdir(), 'redocly-preview-'));
  invocationDir = join(packageRoot, 'docs', 'sub');
  mkdirSync(invocationDir, { recursive: true });
  vi.spyOn(process, 'cwd').mockReturnValue(packageRoot);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(packageRoot, { recursive: true, force: true });
});

describe('resolveProjectDir', () => {
  it('resolves a relative directory against INIT_CWD when it is inside the current directory', () => {
    expect(resolveProjectDir('api', { INIT_CWD: invocationDir })).toBe(join(invocationDir, 'api'));
  });

  it('ignores INIT_CWD when it is outside the current directory', () => {
    expect(resolveProjectDir('api', { INIT_CWD: join(packageRoot, '..') })).toBe(
      join(packageRoot, 'api')
    );
  });

  it('resolves a relative directory against the current directory without INIT_CWD', () => {
    expect(resolveProjectDir('api', {})).toBe(join(packageRoot, 'api'));
  });

  it('keeps an absolute directory', () => {
    expect(resolveProjectDir('/abs/docs', { INIT_CWD: invocationDir })).toBe(resolve('/abs/docs'));
  });
});

describe('previewProject', () => {
  it('passes the absolute invocation directory to the framework as --project-dir', async () => {
    vi.stubEnv('INIT_CWD', invocationDir);

    await run({ 'project-dir': '.' });

    expect(spawnedArgs()).toContainEqual(expect.stringContaining(`--project-dir=${invocationDir}`));
    expect(spawnedOptions().cwd).toBe(invocationDir);
  });

  it('detects the product package in the resolved directory', async () => {
    vi.stubEnv('INIT_CWD', invocationDir);
    writeFileSync(
      join(invocationDir, 'package.json'),
      JSON.stringify({ dependencies: { '@redocly/realm': '1.0.0' } })
    );

    await run({ 'project-dir': '.' });

    expect(spawnedArgs()).toContain('@redocly/realm');
  });
});
