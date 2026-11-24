import { HandledError } from '@redocly/openapi-core';
import {
  getPlatformUrl,
  RedoclyOAuthClient,
  resolveHostedProject,
} from '@redocly/platform-integration';

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
vi.mock('@redocly/platform-integration', async () => {
  const actual = await vi.importActual<object>('@redocly/platform-integration');
  return {
    ...actual,
    getPlatformUrl: vi.fn(),
    resolveHostedProject: vi.fn(),
    RedoclyOAuthClient: vi.fn(),
  };
});

const HELPER_CONFIG = [
  'credential.http://localhost/.helper=',
  'credential.http://localhost/.helper=!x',
];

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly project clone', () => {
  const getAccessToken = vi.fn();

  beforeEach(() => {
    vi.stubEnv('REDOCLY_AUTHORIZATION', '');
    vi.mocked(getPlatformUrl).mockReturnValue('http://localhost');
    vi.mocked(getCredentialHelperConfig).mockReturnValue(HELPER_CONFIG);
    vi.mocked(runGit).mockResolvedValue({ code: 0, output: '' });
    getAccessToken.mockResolvedValue('token');
    vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any) {
      this.getAccessToken = getAccessToken;
    } as any);
    vi.mocked(resolveHostedProject).mockResolvedValue({
      platformUrl: 'http://localhost',
      organization: 'org_1',
      project: 'prj_1',
      organizationSlug: 'acme',
      projectSlug: 'docs',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('clone', () => {
    it.each([
      { directory: 'my-docs', clonedInto: 'my-docs' },
      { directory: undefined, clonedInto: 'docs' },
    ])(
      'clones the project git URL with ids into $clonedInto with the credential helper saved in the repository',
      async ({ directory, clonedInto }) => {
        await handleProjectClone(
          commandArgs<ProjectCloneArgv>({ project: 'acme/docs', directory })
        );

        expect(resolveHostedProject).toHaveBeenCalledWith({
          platformUrl: 'http://localhost',
          organization: 'acme',
          project: 'docs',
          version: '2.0.0',
          command: 'project clone',
          accessToken: 'token',
        });
        expect(getCredentialHelperConfig).toHaveBeenCalledWith('http://localhost', '2.0.0');
        expect(runGit).toHaveBeenCalledWith([
          'clone',
          '--config',
          HELPER_CONFIG[0],
          '--config',
          HELPER_CONFIG[1],
          '--',
          'http://localhost/api/orgs/org_1/projects/prj_1/git',
          clonedInto,
        ]);
      }
    );

    it('looks the project up with REDOCLY_AUTHORIZATION, which git also authenticates with', async () => {
      vi.stubEnv('REDOCLY_AUTHORIZATION', 'sk_1');

      await handleProjectClone(commandArgs<ProjectCloneArgv>({ project: 'acme/docs' }));

      expect(getAccessToken).not.toHaveBeenCalled();
      expect(resolveHostedProject).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'sk_1', organization: 'acme', project: 'docs' })
      );
      expect(runGit).toHaveBeenCalledWith(
        expect.arrayContaining(['http://localhost/api/orgs/org_1/projects/prj_1/git'])
      );
    });

    it('clones by the given values without a login or an API key', async () => {
      getAccessToken.mockResolvedValue(undefined);

      await handleProjectClone(commandArgs<ProjectCloneArgv>({ project: 'acme/docs' }));

      expect(resolveHostedProject).not.toHaveBeenCalled();
      expect(runGit).toHaveBeenCalledWith(
        expect.arrayContaining(['http://localhost/api/orgs/acme/projects/docs/git'])
      );
    });

    it('fails without cloning when the project cannot be looked up', async () => {
      vi.mocked(resolveHostedProject).mockRejectedValue(
        new Error('Project "docs" was not found in organization "acme".')
      );

      await expect(
        handleProjectClone(commandArgs<ProjectCloneArgv>({ project: 'acme/docs' }))
      ).rejects.toThrow(new HandledError('Project "docs" was not found in organization "acme".'));
      expect(runGit).not.toHaveBeenCalled();
    });

    it('fails when git exits with an error', async () => {
      vi.mocked(runGit).mockResolvedValue({ code: 128, output: '' });

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
