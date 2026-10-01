import { HandledError } from '@redocly/openapi-core';
import type * as ReuniteIntegration from '@redocly/reunite-integration';
import { RedoclyOAuthClient } from '@redocly/reunite-integration';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { buildProjectGitUrl, findRedoclyRemote, resolveGitAuthHeader, runGit } from '../utils.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn(), spawnSync: vi.fn() }));
vi.mock('@redocly/reunite-integration', async () => ({
  ...(await vi.importActual<typeof ReuniteIntegration>('@redocly/reunite-integration')),
  RedoclyOAuthClient: vi.fn(),
}));

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
    function mockChild(version = 'git version 2.55.0') {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: `${version}\n` } as any);
      const child = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(child as any);
      return child;
    }

    it('passes the credential through the environment, scoped to the Reunite host', async () => {
      delete process.env.GIT_CONFIG_COUNT;
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
        ['push', '--force'],
        expect.objectContaining({
          stdio: 'inherit',
          env: expect.objectContaining({
            GIT_TERMINAL_PROMPT: '0',
            GIT_CONFIG_COUNT: '2',
            GIT_CONFIG_KEY_0: 'http.http://localhost/.extraHeader',
            GIT_CONFIG_VALUE_0: 'Cookie: accessToken=abc',
            GIT_CONFIG_KEY_1: 'credential.http://localhost/.helper',
            GIT_CONFIG_VALUE_1: '',
          }),
        })
      );
    });

    it('keeps git configuration that the environment already passes', async () => {
      process.env.GIT_CONFIG_COUNT = '1';
      const child = mockChild();
      const exitCode = runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] });
      child.emit('close', 0);

      await expect(exitCode).resolves.toBe(0);
      expect(vi.mocked(spawn).mock.calls[0]?.[2]?.env).toMatchObject({
        GIT_CONFIG_COUNT: '3',
        GIT_CONFIG_KEY_1: 'http.http://localhost/.extraHeader',
      });
    });

    it('resolves with the git exit code', async () => {
      const child = mockChild();
      const exitCode = runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] });
      child.emit('close', 1);

      await expect(exitCode).resolves.toBe(1);
    });

    it('requires git 2.31 or later', async () => {
      mockChild('git version 2.30.9');

      await expect(
        runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] })
      ).rejects.toThrow('need git 2.31 or later');
      expect(spawn).not.toHaveBeenCalled();
    });

    it('explains a missing git binary', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        error: Object.assign(new Error('spawnSync git ENOENT'), { code: 'ENOENT' }),
      } as any);

      await expect(
        runGit({ reuniteUrl: 'http://localhost', authHeader: 'x', args: ['pull'] })
      ).rejects.toThrow('git is not installed or not on PATH.');
    });
  });
});
