import { HandledError } from '@redocly/openapi-core';
import { RedoclyOAuthClient } from '@redocly/reunite-integration';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { buildProjectGitUrl, findRedoclyRemote, resolveGitAuthHeader, runGit } from '../utils.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn(), spawnSync: vi.fn() }));
vi.mock('@redocly/reunite-integration', () => ({ RedoclyOAuthClient: vi.fn() }));

describe('git utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDOCLY_AUTHORIZATION;
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
  });

  describe('resolveGitAuthHeader', () => {
    it('uses the API key from REDOCLY_AUTHORIZATION when set', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'sk_test';

      await expect(resolveGitAuthHeader('http://localhost', '2.0.0')).resolves.toBe(
        'Authorization: Bearer sk_test'
      );
      expect(RedoclyOAuthClient).not.toHaveBeenCalled();
    });

    it('uses the stored login token as a session cookie', async () => {
      const getAccessToken = vi.fn().mockResolvedValue('token-123');
      vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any) {
        this.getAccessToken = getAccessToken;
      } as any);

      await expect(resolveGitAuthHeader('http://localhost', '2.0.0')).resolves.toBe(
        'Cookie: accessToken=token-123'
      );
      expect(RedoclyOAuthClient).toHaveBeenCalledWith('2.0.0');
      expect(getAccessToken).toHaveBeenCalledWith('http://localhost');
    });

    it('asks the user to log in when there is no credential', async () => {
      vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any) {
        this.getAccessToken = vi.fn().mockResolvedValue(null);
      } as any);

      const result = resolveGitAuthHeader('http://localhost', '2.0.0');

      await expect(result).rejects.toBeInstanceOf(HandledError);
      await expect(result).rejects.toThrow('redocly login --residency http://localhost');
    });
  });

  describe('runGit', () => {
    function mockChild() {
      const child = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(child as any);
      return child;
    }

    it('spawns git with the header scoped to the Reunite host and no prompts', async () => {
      const child = mockChild();
      const exitCode = runGit({
        reuniteUrl: 'http://localhost',
        authHeader: 'Cookie: accessToken=abc',
        args: ['push', '--force'],
      });
      child.emit('close', 0);

      await expect(exitCode).resolves.toBe(0);
      expect(spawn).toHaveBeenCalledWith(
        'git',
        [
          '-c',
          'http.http://localhost/.extraHeader=Cookie: accessToken=abc',
          '-c',
          'credential.helper=',
          'push',
          '--force',
        ],
        expect.objectContaining({
          stdio: 'inherit',
          env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }),
        })
      );
    });

    it('resolves with the git exit code', async () => {
      const child = mockChild();
      const exitCode = runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] });
      child.emit('close', 1);

      await expect(exitCode).resolves.toBe(1);
    });

    it('explains a missing git binary', async () => {
      const child = mockChild();
      const exitCode = runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] });
      child.emit('error', Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }));

      await expect(exitCode).rejects.toThrow('git is not installed or not on PATH.');
    });
  });
});
