import { HandledError, logger } from '@redocly/openapi-core';
import { getReuniteUrl } from '@redocly/reunite-integration';

import type { CommandArgv } from '../../../types.js';
import type { CommandArgs } from '../../../wrapper.js';
import { type ProjectCloneArgv, handleProjectClone } from '../index.js';
import type * as GitUtils from '../utils.js';
import { getCredentialHelperConfig, runGit } from '../utils.js';

vi.mock('../utils.js', async () => {
  const actual = await vi.importActual<typeof GitUtils>('../utils.js');
  return {
    ...actual,
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

describe('redocly project clone', () => {
  beforeEach(() => {
    vi.mocked(getReuniteUrl).mockReturnValue('http://localhost');
    vi.mocked(getCredentialHelperConfig).mockReturnValue(HELPER_CONFIG);
    vi.mocked(runGit).mockResolvedValue(0);
    vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  describe('clone', () => {
    it.each([
      { directory: 'my-docs', clonedInto: 'my-docs' },
      { directory: undefined, clonedInto: 'docs' },
    ])(
      'clones the project git URL into $clonedInto with the credential helper saved in the repository',
      async ({ directory, clonedInto }) => {
        await handleProjectClone(
          commandArgs<ProjectCloneArgv>({ project: 'acme/docs', directory })
        );

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
        handleProjectClone(commandArgs<ProjectCloneArgv>({ project: 'acme/docs' }))
      ).rejects.toBeInstanceOf(HandledError);
    });

    it.each(['docs', 'acme/', '/docs', 'acme/docs/extra'])(
      'rejects %s, which is not <organization>/<project>',
      async (project) => {
        await expect(
          handleProjectClone(commandArgs<ProjectCloneArgv>({ project }))
        ).rejects.toThrow('Specify the project as `<organization>/<project>`');
        expect(runGit).not.toHaveBeenCalled();
      }
    );
  });
});
