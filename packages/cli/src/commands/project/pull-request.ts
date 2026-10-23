import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { readFile } from 'node:fs/promises';

import type { CommandArgs } from '../../wrapper.js';
import { parseProjectGitUrl, readGit } from './utils.js';

export type ProjectPullRequestCreateArgv = {
  title?: string;
  body?: string;
  'body-file'?: string;
  base?: string;
  draft?: boolean;
};

// Opens a pull request in Reunite for the current branch of a clone made by `project clone`,
// and prints its URL.
export async function handleProjectPullRequestCreate({
  argv,
  version,
}: CommandArgs<ProjectPullRequestCreateArgv>) {
  const remote = parseProjectGitUrl((await readGit(['remote', 'get-url', 'origin'])) ?? '');
  if (!remote) {
    throw new HandledError(
      'Run this command in a clone of a Redocly-hosted project. Clone one with `redocly project clone`.'
    );
  }

  const branch = await readGit(['branch', '--show-current']);
  if (!branch) {
    throw new HandledError('Check out the branch to open a pull request for.');
  }
  if (
    (await readGit(['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`])) ===
    undefined
  ) {
    throw new HandledError(`Push the branch first: \`git push -u origin ${branch}\`.`);
  }
  const description = await readBody(argv);

  const { reuniteUrl, organization, project } = remote;
  const accessToken = await new RedoclyOAuthClient(version).getAccessToken(reuniteUrl);
  if (!accessToken) {
    throw new HandledError(
      `You are not logged in to ${reuniteUrl}. Run \`redocly login --residency ${reuniteUrl}\`.`
    );
  }

  const orgSegment = encodeURIComponent(organization);
  const projectSegment = encodeURIComponent(project);
  const response = await new ReuniteApiClient('project pull-request create', version).request(
    `${reuniteUrl}/api/orgs/${orgSegment}/projects/${projectSegment}/pull-requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `accessToken=${accessToken}` },
      body: JSON.stringify({
        branchName: branch,
        targetBranchName: argv.base,
        title: argv.title ?? (await readGit(['log', '-1', '--format=%s'])),
        description,
        isDraft: argv.draft,
      }),
    }
  );
  const result: { number?: number; title?: string; detail?: string } = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new HandledError(
      `Failed to open a pull request: ${result.detail || result.title || response.statusText}`
    );
  }

  logger.output(
    `${reuniteUrl}/org/${orgSegment}/project/${projectSegment}/pull-requests/${result.number}\n`
  );
}

// `--body-file -` reads the body from standard input.
async function readBody({ body, 'body-file': bodyFile }: ProjectPullRequestCreateArgv) {
  if (bodyFile === undefined) {
    return body;
  }
  if (bodyFile === '-') {
    let text = '';
    for await (const chunk of process.stdin) {
      text += chunk;
    }
    return text;
  }

  try {
    return await readFile(bodyFile, 'utf8');
  } catch (error) {
    throw new HandledError(`Can't read the body file \`${bodyFile}\`: ${error.message}`);
  }
}
