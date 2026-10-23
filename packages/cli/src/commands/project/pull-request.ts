import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

import type { CommandArgs } from '../../wrapper.js';
import { parseProjectGitUrl, readGit } from './utils.js';

const PREVIEW_WAIT_MS = 20_000;
const PREVIEW_POLL_INTERVAL_MS = 2_000;

export type ProjectPullRequestCreateArgv = {
  title?: string;
  body?: string;
  'body-file'?: string;
  base?: string;
  draft?: boolean;
};

// Opens a pull request in Reunite for the current branch of a clone made by `project clone`,
// and prints its URL and the preview URL of the branch.
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
  const projectApiUrl = `${reuniteUrl}/api/orgs/${orgSegment}/projects/${projectSegment}`;
  const projectUiUrl = `${reuniteUrl}/org/${orgSegment}/project/${projectSegment}`;
  const client = new ReuniteApiClient('project pull-request create', version);
  const headers = { 'Content-Type': 'application/json', Cookie: `accessToken=${accessToken}` };
  const response = await client.request(`${projectApiUrl}/pull-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      branchName: branch,
      targetBranchName: argv.base,
      title: argv.title ?? (await readGit(['log', '-1', '--format=%s'])),
      description,
      isDraft: argv.draft,
    }),
  });
  const result: { number?: number; title?: string; detail?: string } = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new HandledError(
      `Failed to open a pull request: ${result.detail || result.title || response.statusText}`
    );
  }

  logger.output(`Pull request: ${projectUiUrl}/pull-requests/${result.number}\n`);

  const branchFilter = encodeURIComponent(`branchName:${escapeFilterValue(branch)}`);
  const previewUrl = await findPreviewUrl(() =>
    client.request(`${projectApiUrl}/builds?limit=1&filter=${branchFilter}`, { headers })
  ).catch(() => undefined);
  const buildsUrl = `${projectUiUrl}/deployments?branch=${encodeURIComponent(branch)}`;
  logger.output(
    previewUrl
      ? `Preview: ${previewUrl}\n`
      : `Preview: no build yet. See the builds: ${buildsUrl}\n`
  );
}

// The URL of the branch's latest build. A build starts a few seconds after a push or a new
// pull request, so this waits for one; undefined when none starts in time.
async function findPreviewUrl(listLatestBuild: () => Promise<Response>) {
  const deadline = Date.now() + PREVIEW_WAIT_MS;

  for (;;) {
    const response = await listLatestBuild();
    if (!response.ok) {
      return undefined;
    }
    const builds: { data?: { url?: string }[] } = await response.json();
    const url = builds.data?.[0]?.url;
    if (url || Date.now() >= deadline) {
      return url;
    }
    await setTimeout(PREVIEW_POLL_INTERVAL_MS);
  }
}

// Reunite splits an unquoted filter value at commas.
function escapeFilterValue(value: string) {
  return /[\s,'"]/.test(value) ? `"${value.replace(/(['"])/g, '\\$1')}"` : value;
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
