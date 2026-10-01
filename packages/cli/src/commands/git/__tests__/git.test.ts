import { HandledError } from '@redocly/openapi-core';
import { getReuniteUrl } from '@redocly/reunite-integration';

import type { CommandArgv } from '../../../types.js';
import type { CommandArgs } from '../../../wrapper.js';
import {
  type GitCloneArgv,
  type GitPullArgv,
  type GitPushArgv,
  handleGitClone,
  handleGitPull,
  handleGitPush,
} from '../index.js';
import type * as GitUtils from '../utils.js';
import { findRedoclyRemote, resolveGitAuthHeader, runGit } from '../utils.js';

vi.mock('../utils.js', async () => {
  const actual = await vi.importActual<typeof GitUtils>('../utils.js');
  return {
    ...actual,
    findRedoclyRemote: vi.fn(),
    resolveGitAuthHeader: vi.fn(),
    runGit: vi.fn(),
  };
});
vi.mock('@redocly/reunite-integration', () => ({ getReuniteUrl: vi.fn() }));

const REMOTE = {
  name: 'origin',
  url: 'http://localhost/api/orgs/acme/projects/docs/git',
  reuniteUrl: 'http://localhost',
  organization: 'acme',
  project: 'docs',
};

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly git', () => {
  beforeEach(() => {
    vi.mocked(getReuniteUrl).mockReturnValue('http://localhost');
    vi.mocked(resolveGitAuthHeader).mockResolvedValue('Cookie: accessToken=abc');
    vi.mocked(runGit).mockResolvedValue(0);
    vi.mocked(findRedoclyRemote).mockReturnValue(REMOTE);
  });

  describe('clone', () => {
    it('clones the project git URL into the given directory', async () => {
      await handleGitClone(
        commandArgs<GitCloneArgv>({ organization: 'acme', project: 'docs', directory: 'my-docs' })
      );

      expect(resolveGitAuthHeader).toHaveBeenCalledWith('http://localhost', '2.0.0');
      expect(runGit).toHaveBeenCalledWith({
        reuniteUrl: 'http://localhost',
        authHeader: 'Cookie: accessToken=abc',
        args: ['clone', 'http://localhost/api/orgs/acme/projects/docs/git', 'my-docs'],
      });
    });

    it('clones into a directory named after the project by default', async () => {
      await handleGitClone(commandArgs<GitCloneArgv>({ organization: 'acme', project: 'docs' }));

      expect(runGit).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['clone', 'http://localhost/api/orgs/acme/projects/docs/git', 'docs'],
        })
      );
    });

    it('fails when git exits with an error', async () => {
      vi.mocked(runGit).mockResolvedValue(128);

      await expect(
        handleGitClone(commandArgs<GitCloneArgv>({ organization: 'acme', project: 'docs' }))
      ).rejects.toBeInstanceOf(HandledError);
    });
  });

  describe('push', () => {
    it('pushes through the Redocly remote found in the repository', async () => {
      await handleGitPush(
        commandArgs<GitPushArgv>({ force: true, 'set-upstream': true, refspec: ['origin', 'main'] })
      );

      expect(findRedoclyRemote).toHaveBeenCalledWith(process.cwd());
      expect(resolveGitAuthHeader).toHaveBeenCalledWith('http://localhost', '2.0.0');
      expect(runGit).toHaveBeenCalledWith({
        reuniteUrl: 'http://localhost',
        authHeader: 'Cookie: accessToken=abc',
        args: ['push', '--force', '--set-upstream', 'origin', 'main'],
      });
    });

    it('runs a plain git push by default', async () => {
      await handleGitPush(commandArgs<GitPushArgv>({}));

      expect(runGit).toHaveBeenCalledWith(expect.objectContaining({ args: ['push'] }));
    });

    it('fails when the repository has no Redocly remote', async () => {
      vi.mocked(findRedoclyRemote).mockReturnValue(null);

      await expect(handleGitPush(commandArgs<GitPushArgv>({}))).rejects.toThrow(
        'No Redocly remote found'
      );
      expect(runGit).not.toHaveBeenCalled();
    });

    it('fails when git exits with an error', async () => {
      vi.mocked(runGit).mockResolvedValue(1);

      await expect(handleGitPush(commandArgs<GitPushArgv>({}))).rejects.toThrow('git push failed.');
    });
  });

  describe('pull', () => {
    it('pulls through the Redocly remote', async () => {
      await handleGitPull(commandArgs<GitPullArgv>({ refspec: ['origin', 'feature'] }));

      expect(runGit).toHaveBeenCalledWith({
        reuniteUrl: 'http://localhost',
        authHeader: 'Cookie: accessToken=abc',
        args: ['pull', 'origin', 'feature'],
      });
    });
  });
});
