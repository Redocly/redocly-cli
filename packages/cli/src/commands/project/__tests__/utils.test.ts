import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { getCredentialHelperConfig, runGit } from '../utils.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
vi.mock('node:fs', () => ({ existsSync: vi.fn() }));

describe('git utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PATH: ['/usr/bin', '/opt/node/bin'].join(path.delimiter) };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getCredentialHelperConfig', () => {
    it('clears other helpers for the Reunite host and runs the installed CLI', () => {
      vi.mocked(existsSync).mockImplementation(
        (file) => file === path.join('/opt/node/bin', 'redocly')
      );

      expect(getCredentialHelperConfig('https://app.cloud.redocly.com', '2.0.0')).toEqual([
        'credential.https://app.cloud.redocly.com/.helper=',
        'credential.https://app.cloud.redocly.com/.helper=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true redocly project git-credentials',
      ]);
    });

    it.each([
      ['npx', '/home/u/.npm/_npx/3f2a/node_modules/.bin/redocly'],
      ['pnpm dlx', '/home/u/.cache/pnpm/dlx/3f2a/node_modules/.bin/redocly'],
    ])(
      'pins the npx fallback to its own version when %s runs the clone, even with another CLI on PATH',
      (_runner, script) => {
        const argv = process.argv;
        process.argv = [argv[0] ?? 'node', script];
        vi.mocked(existsSync).mockImplementation(
          (file) => file === path.join('/opt/node/bin', 'redocly')
        );

        try {
          expect(getCredentialHelperConfig('https://app.cloud.redocly.com', '2.0.0')[1]).toBe(
            'credential.https://app.cloud.redocly.com/.helper=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true npx --yes @redocly/cli@2.0.0 project git-credentials'
          );
        } finally {
          process.argv = argv;
        }
      }
    );

    it('runs the same CLI version with npx when the CLI is not on PATH', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(getCredentialHelperConfig('http://localhost', '2.0.0')[1]).toBe(
        'credential.http://localhost/.helper=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true npx --yes @redocly/cli@2.0.0 project git-credentials'
      );
    });
  });

  function mockChild() {
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter() });
    vi.mocked(spawn).mockReturnValue(child as any);
    return child;
  }

  describe('runGit', () => {
    it('runs git without terminal prompts and resolves with its exit code', async () => {
      const child = mockChild();
      const result = runGit(['push', '--force']);
      child.emit('close', 1);

      await expect(result).resolves.toEqual({ code: 1, output: '' });
      expect(spawn).toHaveBeenCalledWith(
        'git',
        ['push', '--force'],
        expect.objectContaining({
          stdio: 'inherit',
          env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }),
        })
      );
    });

    it('resolves with the trimmed output of git with `capture`', async () => {
      const child = mockChild();
      const result = runGit(['branch', '--show-current'], { capture: true });
      child.stdout.emit('data', Buffer.from('fix-'));
      child.stdout.emit('data', Buffer.from('typo\n'));
      child.emit('close', 0);

      await expect(result).resolves.toEqual({ code: 0, output: 'fix-typo' });
      expect(spawn).toHaveBeenCalledWith(
        'git',
        ['branch', '--show-current'],
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'ignore'] })
      );
    });

    it('reports a git killed by a signal as a failure', async () => {
      const child = mockChild();
      const result = runGit(['fetch']);
      child.emit('close', null);

      await expect(result).resolves.toEqual({ code: 1, output: '' });
    });

    it('explains a missing git binary', async () => {
      const child = mockChild();
      const exitCode = runGit(['pull']);
      child.emit('error', Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }));

      await expect(exitCode).rejects.toThrow('git is not installed or not on PATH.');
    });
  });
});
