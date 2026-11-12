import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandArgs } from '../../../wrapper.js';
import { previewProject } from '../index.js';
import type { PreviewProjectArgv } from '../types.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({ on: vi.fn() })),
}));

describe('previewProject', () => {
  // The workspace package npx moves the command to, and the subdirectory it was run from.
  let packageDir: string;
  let invocationDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    packageDir = mkdtempSync(join(tmpdir(), 'redocly-preview-'));
    invocationDir = join(packageDir, 'docs', 'sub');
    mkdirSync(invocationDir, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(packageDir);
    vi.stubEnv('INIT_CWD', invocationDir);
    vi.stubEnv('npm_command', 'exec');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(packageDir, { recursive: true, force: true });
  });

  it('previews the directory npx was run from inside an npm workspace', async () => {
    await previewProject({
      argv: { plan: 'enterprise', 'project-dir': '.' },
    } as CommandArgs<PreviewProjectArgv>);

    const [, args, options] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContainEqual(expect.stringContaining(`--project-dir=${invocationDir}`));
    expect(options).toMatchObject({ cwd: invocationDir });
  });

  it('keeps a relative directory relative to the package root in an npm script', async () => {
    vi.stubEnv('npm_command', 'run');

    await previewProject({
      argv: { plan: 'enterprise', 'project-dir': 'api' },
    } as CommandArgs<PreviewProjectArgv>);

    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContainEqual(
      expect.stringContaining(`--project-dir=${join(packageDir, 'api')}`)
    );
  });

  it('ignores INIT_CWD outside the current directory', async () => {
    vi.stubEnv('INIT_CWD', resolve(packageDir, '..'));

    await previewProject({
      argv: { plan: 'enterprise', 'project-dir': '.' },
    } as CommandArgs<PreviewProjectArgv>);

    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContainEqual(expect.stringContaining(`--project-dir=${packageDir}`));
  });

  it('keeps an absolute directory', async () => {
    await previewProject({
      argv: { plan: 'enterprise', 'project-dir': resolve('/abs/docs') },
    } as CommandArgs<PreviewProjectArgv>);

    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContainEqual(expect.stringContaining(`--project-dir=${resolve('/abs/docs')}`));
  });

  it('detects the product package in the resolved directory', async () => {
    writeFileSync(
      join(invocationDir, 'package.json'),
      JSON.stringify({ dependencies: { '@redocly/realm': '1.0.0' } })
    );

    await previewProject({
      argv: { plan: 'enterprise', 'project-dir': '.' },
    } as CommandArgs<PreviewProjectArgv>);

    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContain('@redocly/realm');
  });
});
