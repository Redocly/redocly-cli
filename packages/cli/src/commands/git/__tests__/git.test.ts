import { HandledError, logger } from '@redocly/openapi-core';
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
import { findReuniteUrl, getCredentialHelperConfig, runGit } from '../utils.js';

vi.mock('../utils.js', async () => {
  const actual = await vi.importActual<typeof GitUtils>('../utils.js');
  return {
    ...actual,
    findReuniteUrl: vi.fn(),
    getCredentialHelperConfig: vi.fn(),
    runGit: vi.fn(),
  };
});
vi.mock('@redocly/reunite-integration', () => ({ getReuniteUrl: vi.fn() }));

const HELPER_CONFIG = [
  'credential.http://localhost/.helper=',
  'credential.http://localhost/.helper=!x',
];

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly git', () => {
  beforeEach(() => {
    vi.mocked(getReuniteUrl).mockReturnValue('http://localhost');
    vi.mocked(getCredentialHelperConfig).mockReturnValue(HELPER_CONFIG);
    vi.mocked(runGit).mockResolvedValue(0);
    vi.mocked(findReuniteUrl).mockReturnValue('http://localhost');
    vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  describe('clone', () => {
    it.each([
      { directory: 'my-docs', clonedInto: 'my-docs' },
      { directory: undefined, clonedInto: 'docs' },
    ])(
      'clones the project git URL into $clonedInto with the credential helper saved in the repository',
      async ({ directory, clonedInto }) => {
        await handleGitClone(commandArgs<GitCloneArgv>({ project: 'acme/docs', directory }));

        expect(getCredentialHelperConfig).toHaveBeenCalledWith('http://localhost', '2.0.0');
        expect(runGit).toHaveBeenCalledWith([
          'clone',
          '--config',
          HELPER_CONFIG[0],
          '--config',
          HELPER_CONFIG[1],
          'http://localhost/api/orgs/acme/projects/docs/git',
          clonedInto,
        ]);
      }
    );

    it('fails when git exits with an error', async () => {
      vi.mocked(runGit).mockResolvedValue(128);

      await expect(
        handleGitClone(commandArgs<GitCloneArgv>({ project: 'acme/docs' }))
      ).rejects.toBeInstanceOf(HandledError);
    });

    it.each(['docs', 'acme/', '/docs', 'acme/docs/extra'])(
      'rejects %s, which is not <organization>/<project>',
      async (project) => {
        await expect(handleGitClone(commandArgs<GitCloneArgv>({ project }))).rejects.toThrow(
          'Specify the project as `<organization>/<project>`'
        );
        expect(runGit).not.toHaveBeenCalled();
      }
    );
  });

  describe('push', () => {
    it('pushes with the credential helper of the Redocly remote', async () => {
      await handleGitPush(
        commandArgs<GitPushArgv>({ force: true, 'set-upstream': true, refspec: ['origin', 'main'] })
      );

      expect(findReuniteUrl).toHaveBeenCalledWith(process.cwd());
      expect(getCredentialHelperConfig).toHaveBeenCalledWith('http://localhost', '2.0.0');
      expect(runGit).toHaveBeenCalledWith([
        '-c',
        HELPER_CONFIG[0],
        '-c',
        HELPER_CONFIG[1],
        'push',
        '--force',
        '--set-upstream',
        'origin',
        'main',
      ]);
    });

    it('runs a plain git push by default', async () => {
      await handleGitPush(commandArgs<GitPushArgv>({}));

      expect(runGit).toHaveBeenCalledWith(['-c', HELPER_CONFIG[0], '-c', HELPER_CONFIG[1], 'push']);
    });

    it('fails when the repository has no Redocly remote', async () => {
      vi.mocked(findReuniteUrl).mockReturnValue(null);

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
    it('pulls with the credential helper of the Redocly remote', async () => {
      await handleGitPull(commandArgs<GitPullArgv>({ refspec: ['origin', 'feature'] }));

      expect(runGit).toHaveBeenCalledWith([
        '-c',
        HELPER_CONFIG[0],
        '-c',
        HELPER_CONFIG[1],
        'pull',
        'origin',
        'feature',
      ]);
    });
  });
});
