import { HandledError, logger } from '@redocly/openapi-core';
import { buildProjectGitUrl, getPlatformUrl } from '@redocly/platform-integration';

import type { CommandArgs } from '../../wrapper.js';
import { getCredentialHelperConfig, runGit } from './utils.js';

export type ProjectCloneArgv = {
  project: string;
  directory?: string;
  residency?: string;
};

// Clones with the credential helper saved in the repository config, so plain `git` works later.
export async function handleProjectClone({ argv, config, version }: CommandArgs<ProjectCloneArgv>) {
  const [organization, project, ...rest] = argv.project.split('/');
  if (!organization || !project || rest.length > 0) {
    throw new HandledError(
      `Specify the project as \`<organization>/<project>\`, for example \`acme/developer-portal\`. Got: \`${argv.project}\`.`
    );
  }

  const platformUrl = getPlatformUrl(config, argv.residency);
  const url = buildProjectGitUrl(platformUrl, organization, project);
  const helperConfig = getCredentialHelperConfig(platformUrl, version);

  logger.info(`Cloning ${organization}/${project} from ${platformUrl}\n`);

  const { code } = await runGit([
    'clone',
    ...helperConfig.flatMap((entry) => ['--config', entry]),
    '--',
    url,
    argv.directory ?? project,
  ]);

  if (code !== 0) {
    throw new HandledError('git clone failed.');
  }
}
