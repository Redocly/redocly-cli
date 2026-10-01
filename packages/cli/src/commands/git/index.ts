import { HandledError, logger } from '@redocly/openapi-core';
import { getReuniteUrl } from '@redocly/reunite-integration';

import type { CommandArgs } from '../../wrapper.js';
import { buildProjectGitUrl, findRedoclyRemote, resolveGitAuthHeader, runGit } from './utils.js';

export type GitCloneArgv = {
  organization: string;
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
  'No Redocly remote found in this repository. Clone a project with `redocly git clone -o <organization> -p <project>`, or add a remote pointing to `<reunite-url>/api/orgs/<organization>/projects/<project>/git`.';

export async function handleGitClone({ argv, config, version }: CommandArgs<GitCloneArgv>) {
  const reuniteUrl = getReuniteUrl(config, argv.residency);
  const url = buildProjectGitUrl(reuniteUrl, argv.organization, argv.project);
  const authHeader = await resolveGitAuthHeader(reuniteUrl, version);

  logger.info(`Cloning ${argv.organization}/${argv.project} from ${reuniteUrl}\n`);

  const exitCode = await runGit({
    reuniteUrl,
    authHeader,
    args: ['clone', url, argv.directory ?? argv.project],
  });

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

  const authHeader = await resolveGitAuthHeader(remote.reuniteUrl, version);
  const exitCode = await runGit({ reuniteUrl: remote.reuniteUrl, authHeader, args });

  if (exitCode !== 0) {
    throw new HandledError(`git ${args[0]} failed.`);
  }
}
