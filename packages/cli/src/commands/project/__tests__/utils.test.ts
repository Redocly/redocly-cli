import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { buildProjectGitUrl, getCredentialHelperConfig, runGit } from '../utils.js';

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

  describe('buildProjectGitUrl', () => {
    it('builds the project git URL and encodes the segments', () => {
      expect(buildProjectGitUrl('http://localhost', 'acme', 'my docs')).toBe(
        'http://localhost/api/orgs/acme/projects/my%20docs/git'
      );
    });
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

  describe('runGit', () => {
    function mockChild() {
      const child = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(child as any);
      return child;
    }

    it('runs git without terminal prompts and resolves with its exit code', async () => {
      const child = mockChild();
      const exitCode = runGit(['push', '--force']);
      child.emit('close', 1);

      await expect(exitCode).resolves.toBe(1);
      expect(spawn).toHaveBeenCalledWith(
        'git',
        ['push', '--force'],
        expect.objectContaining({
          stdio: 'inherit',
          env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }),
        })
      );
    });

    it('explains a missing git binary', async () => {
      const child = mockChild();
      const exitCode = runGit(['pull']);
      child.emit('error', Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }));

      await expect(exitCode).rejects.toThrow('git is not installed or not on PATH.');
    });
  });
});
