import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import {
  buildProjectGitUrl,
  findRedoclyRemote,
  getCredentialHelperConfig,
  runGit,
} from '../utils.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn(), spawnSync: vi.fn() }));
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

  describe('findRedoclyRemote', () => {
    it('returns the first remote pointing at a Redocly project', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout:
          'remote.upstream.url git@github.com:acme/docs.git\n' +
          'remote.origin.url https://app.cloud.redocly.com/api/orgs/acme/projects/docs/git\n',
      } as any);

      expect(findRedoclyRemote('/repo')).toEqual({
        name: 'origin',
        url: 'https://app.cloud.redocly.com/api/orgs/acme/projects/docs/git',
        reuniteUrl: 'https://app.cloud.redocly.com',
        organization: 'acme',
        project: 'docs',
      });
      expect(spawnSync).toHaveBeenCalledWith(
        'git',
        ['config', '--get-regexp', '^remote\\..*\\.url$'],
        { cwd: '/repo', encoding: 'utf-8' }
      );
    });

    it('matches the whole remote URL, including anything after a space', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'remote.origin.url https://example.com/api/orgs/acme/projects/docs/git copy\n',
      } as any);

      expect(findRedoclyRemote('/repo')).toBeNull();
    });

    it('returns null outside a git repository', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 128, stdout: '', stderr: 'fatal' } as any);

      expect(findRedoclyRemote('/repo')).toBeNull();
    });

    it('ignores remotes that are not on an https or local Reunite host', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'remote.origin.url http://example.com/api/orgs/acme/projects/docs/git\n',
      } as any);

      expect(findRedoclyRemote('/repo')).toBeNull();
    });

    it('explains a missing git binary', () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: Object.assign(new Error('spawnSync git ENOENT'), { code: 'ENOENT' }),
      } as any);

      expect(() => findRedoclyRemote('/repo')).toThrow('git is not installed or not on PATH.');
    });
  });

  describe('getCredentialHelperConfig', () => {
    it('clears other helpers for the Reunite host and runs the installed CLI', () => {
      vi.mocked(existsSync).mockImplementation(
        (file) => file === path.join('/opt/node/bin', 'redocly')
      );

      expect(getCredentialHelperConfig('https://app.cloud.redocly.com', '2.0.0')).toEqual([
        'credential.https://app.cloud.redocly.com/.helper=',
        'credential.https://app.cloud.redocly.com/.helper=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true redocly git credential',
      ]);
    });

    it('runs the same CLI version with npx when the CLI is not on PATH', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(getCredentialHelperConfig('http://localhost', '2.0.0')[1]).toBe(
        'credential.http://localhost/.helper=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true npx --yes @redocly/cli@2.0.0 git credential'
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
