import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { readFile } from 'node:fs/promises';

import type { CommandArgs } from '../../wrapper.js';
import { parseProjectGitUrl, readGit } from './utils.js';

export type ProjectPrCreateArgv = {
  title?: string;
  body?: string;
  'body-file'?: string;
  base?: string;
  draft?: boolean;
};

type PullRequest = {
  id: string;
  number: number;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft?: boolean;
  reviewDecision?: 'APPROVED' | 'REQUESTED_CHANGES' | 'REVIEW_REQUIRED';
  headCommitHash?: string;
};

type Check = { context: string; state: string; description?: string; targetUrl?: string };

const REVIEW_DECISIONS = {
  APPROVED: 'approved',
  REQUESTED_CHANGES: 'changes requested',
  REVIEW_REQUIRED: 'review required',
};

const CHECK_STATES: Record<string, string> = {
  PENDING: 'pending',
  IN_PROGRESS: 'pending',
  SUCCESS: 'passed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Opens a pull request in Reunite for the current branch of a clone made by `project clone`,
// and prints its URL.
export async function handleProjectPrCreate({ argv, version }: CommandArgs<ProjectPrCreateArgv>) {
  const { branch, request, uiUrl } = await connect('project pr create', version);
  if (
    (await readGit(['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`])) ===
    undefined
  ) {
    throw new HandledError(`Push the branch first: \`git push -u origin ${branch}\`.`);
  }

  const pullRequest = await request<PullRequest>(
    '/pull-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        branchName: branch,
        targetBranchName: argv.base,
        title: argv.title ?? (await readGit(['log', '-1', '--format=%s'])),
        description: await readBody(argv),
        isDraft: argv.draft,
      }),
    },
    'Failed to open a pull request'
  );

  logger.output(`${uiUrl}/pull-requests/${pullRequest.number}\n`);
}

// Prints the latest pull request of the current branch: its state, review decision, checks, and
// the preview URL once the preview of its head commit is deployed.
export async function handleProjectPrStatus({ version }: { version: string }) {
  const { branch, request, uiUrl } = await connect('project pr status', version);
  const {
    data: [pullRequest],
  } = await request<{ data: PullRequest[] }>(
    `/pull-requests?${new URLSearchParams({ branchName: branch, limit: '1' })}`,
    {},
    'Failed to get the pull request'
  );
  if (!pullRequest) {
    throw new HandledError(
      `No pull request for \`${branch}\`. Open one with \`redocly project pr create\`.`
    );
  }

  const checks = await request<Check[]>(
    `/pull-requests/${pullRequest.id}/checks`,
    {},
    'Failed to get the checks'
  );
  const {
    data: [build],
  } = pullRequest.headCommitHash
    ? await request<{ data: { url: string; deploymentStatus: string }[] }>(
        `/builds?limit=1&filter=commitHash:${pullRequest.headCommitHash}`,
        {},
        'Failed to get the preview'
      )
    : { data: [] };

  const prState =
    pullRequest.status === 'OPEN' && pullRequest.isDraft
      ? 'draft'
      : pullRequest.status.toLowerCase();
  const review = pullRequest.reviewDecision ? REVIEW_DECISIONS[pullRequest.reviewDecision] : 'none';
  const lines = [
    `#${pullRequest.number} ${pullRequest.title}`,
    `${uiUrl}/pull-requests/${pullRequest.number}`,
    `State: ${prState}`,
    `Review: ${review}`,
    checks.length > 0 ? 'Checks:' : 'Checks: none',
    ...checks.map(
      ({ context, state, description, targetUrl }) =>
        `  ${(CHECK_STATES[state] ?? state).padEnd(9)} ${context}` +
        (description ? ` - ${description}` : '') +
        (targetUrl ? ` ${targetUrl}` : '')
    ),
    `Preview: ${build?.deploymentStatus === 'SUCCESS' ? build.url : 'not ready'}`,
  ];

  logger.output(`${lines.join('\n')}\n`);
}

// The current branch of a clone made by `project clone`, and a request function for its project
// that authenticates with the `redocly login` token and throws on an error response.
async function connect(command: string, version: string) {
  const remote = parseProjectGitUrl((await readGit(['remote', 'get-url', 'origin'])) ?? '');
  if (!remote) {
    throw new HandledError(
      'Run this command in a clone of a Redocly-hosted project. Clone one with `redocly project clone`.'
    );
  }

  const branch = await readGit(['branch', '--show-current']);
  if (!branch) {
    throw new HandledError('Check out a branch first.');
  }

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
  const client = new ReuniteApiClient(command, version);

  async function request<T>(
    path: string,
    init: { method?: string; body?: string },
    failure: string
  ): Promise<T> {
    const response = await client
      .request(`${projectApiUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Cookie: `accessToken=${accessToken}` },
      })
      .catch((error) => {
        throw new HandledError(`${failure}: ${error.message}`);
      });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new HandledError(`${failure}: ${result.detail || result.title || response.statusText}`);
    }
    return result as T;
  }

  return { branch, request, uiUrl: `${reuniteUrl}/org/${orgSegment}/project/${projectSegment}` };
}

// `--body-file -` reads the body from standard input.
async function readBody({ body, 'body-file': bodyFile }: ProjectPrCreateArgv) {
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
