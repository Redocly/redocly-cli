import { HandledError, logger } from '@redocly/openapi-core';
import { getReuniteUrl } from '@redocly/reunite-integration';

import type { CommandArgs } from '../../wrapper.js';
import {
  buildProjectGitUrl,
  findRedoclyRemote,
  getCredentialHelperConfig,
  runGit,
} from './utils.js';

export type GitCloneArgv = {
  // `<organization>/<project>`
  project: string;
  directory?: string;
  residency?: string;
};

export type GitPushArgv = {
  force?: boolean;
  'set-upstream'?: boolean;
  refspec?: string[];
};

export type GitPullArgv = {
  refspec?: string[];
};

const NO_REMOTE_MESSAGE =
  'No Redocly remote found in this repository. Clone a project with `redocly git clone <organization>/<project>`, or add a remote pointing to `<reunite-url>/api/orgs/<organization>/projects/<project>/git`.';

// Clones with the credential helper saved in the repository config, so plain `git` works later.
export async function handleGitClone({ argv, config, version }: CommandArgs<GitCloneArgv>) {
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

export async function handleGitPush({ argv, version }: CommandArgs<GitPushArgv>) {
  const args = ['push'];
  if (argv.force) {
    args.push('--force');
  }
  if (argv['set-upstream']) {
    args.push('--set-upstream');
  }
  args.push(...(argv.refspec ?? []));

  await runInRedoclyRemote(args, version);
}

export async function handleGitPull({ argv, version }: CommandArgs<GitPullArgv>) {
  await runInRedoclyRemote(['pull', ...(argv.refspec ?? [])], version);
}

async function runInRedoclyRemote(args: string[], version: string) {
  const remote = findRedoclyRemote(process.cwd());
  if (!remote) {
    throw new HandledError(NO_REMOTE_MESSAGE);
  }

  const helperConfig = getCredentialHelperConfig(remote.reuniteUrl, version);
  const exitCode = await runGit([...helperConfig.flatMap((entry) => ['-c', entry]), ...args]);

  if (exitCode !== 0) {
    throw new HandledError(`git ${args[0]} failed.`);
  }
}
