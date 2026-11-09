import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

describe('resolveProjectDir', () => {
  it('resolves a relative directory against INIT_CWD when npm set it', () => {
    expect(resolveProjectDir('docs', { INIT_CWD: '/repo/project/sub' })).toBe(
      resolve('/repo/project/sub', 'docs')
    );
  });

  it('resolves a relative directory against the current directory without INIT_CWD', () => {
    expect(resolveProjectDir('docs', {})).toBe(resolve(process.cwd(), 'docs'));
  });

  it('keeps an absolute directory', () => {
    expect(resolveProjectDir('/abs/docs', { INIT_CWD: '/repo/project/sub' })).toBe(
      resolve('/abs/docs')
    );
  });
});

describe('previewProject', () => {
  let projectDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    projectDir = mkdtempSync(join(tmpdir(), 'redocly-preview-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('passes the absolute invocation directory to the framework as --project-dir', async () => {
    vi.stubEnv('INIT_CWD', projectDir);

    await run({ 'project-dir': '.' });

    expect(spawnedArgs()).toContain(`--project-dir=${projectDir}`);
    expect(spawnedOptions().cwd).toBe(projectDir);
  });

  it('detects the product package in the resolved directory', async () => {
    vi.stubEnv('INIT_CWD', projectDir);
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({ dependencies: { '@redocly/realm': '1.0.0' } })
    );

    await run({ 'project-dir': '.' });

    expect(spawnedArgs()).toContain('@redocly/realm');
  });
});
