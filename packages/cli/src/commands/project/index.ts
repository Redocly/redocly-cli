import { HandledError, logger } from '@redocly/openapi-core';
import { getReuniteUrl } from '@redocly/reunite-integration';

import type { CommandArgs } from '../../wrapper.js';
import { buildProjectGitUrl, getCredentialHelperConfig, runGit } from './utils.js';

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

  const reuniteUrl = getReuniteUrl(config, argv.residency);
  const url = buildProjectGitUrl(reuniteUrl, organization, project);
  const helperConfig = getCredentialHelperConfig(reuniteUrl, version);

  logger.info(`Cloning ${organization}/${project} from ${reuniteUrl}\n`);

  const exitCode = await runGit([
    'clone',
    ...helperConfig.flatMap((entry) => ['--config', entry]),
    url,
    argv.directory ?? project,
  ]);

  if (exitCode !== 0) {
    throw new HandledError('git clone failed.');
  }
}
