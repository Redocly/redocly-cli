import { HandledError, logger } from '@redocly/openapi-core';
import {
  createPullRequest,
  getPullRequestStatus,
  parseProjectGitUrl,
  RedoclyOAuthClient,
  type HostedProject,
  type PullRequestStatus,
} from '@redocly/reunite-integration';
import { readFile } from 'node:fs/promises';

import type { CommandArgs } from '../../wrapper.js';
import { runGit } from './utils.js';

export type ProjectPrCreateArgv = {
  title?: string;
  body?: string;
  'body-file'?: string;
  base?: string;
  draft?: boolean;
};

const REVIEW_DECISIONS = {
  APPROVED: 'approved',
  REQUESTED_CHANGES: 'changes requested',
  REVIEW_REQUIRED: 'review required',
};

const CHECK_STATES = {
  PENDING: 'pending',
  IN_PROGRESS: 'pending',
  SUCCESS: 'passed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Opens a pull request in Reunite for the current branch of a clone made by `project clone`,
// and prints its URL.
export async function handleProjectPrCreate({ argv, version }: CommandArgs<ProjectPrCreateArgv>) {
  const { project, branch } = await readClone();
  const pushed = await runGit(
    ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`],
    {
      capture: true,
    }
  );
  if (pushed.code !== 0) {
    throw new HandledError(`Push the branch first: \`git push -u origin ${branch}\`.`);
  }

  const pullRequest = await createPullRequest({
    ...project,
    accessToken: await readLoginToken(project.reuniteUrl, version),
    version,
    branch,
    title: argv.title ?? (await runGit(['log', '-1', '--format=%s'], { capture: true })).output,
    description: await readBody(argv),
    base: argv.base,
    draft: argv.draft,
  }).catch(asHandledError);

  logger.output(`${pullRequestUrl(project, pullRequest.number)}\n`);
}

// Prints the latest pull request of the current branch.
export async function handleProjectPrStatus({ version }: { version: string }) {
  const { project, branch } = await readClone();
  const status = await getPullRequestStatus({
    ...project,
    accessToken: await readLoginToken(project.reuniteUrl, version),
    version,
    branch,
  }).catch(asHandledError);
  if (!status) {
    throw new HandledError(
      `No pull request for \`${branch}\`. Open one with \`redocly project pr create\`.`
    );
  }

  logger.output(
    formatPullRequestStatus(status, pullRequestUrl(project, status.pullRequest.number))
  );
}

export function formatPullRequestStatus(
  { pullRequest, checks, previewUrl }: PullRequestStatus,
  url: string
): string {
  const state =
    pullRequest.status === 'OPEN' && pullRequest.isDraft
      ? 'draft'
      : pullRequest.status.toLowerCase();
  const review = pullRequest.reviewDecision ? REVIEW_DECISIONS[pullRequest.reviewDecision] : 'none';
  const lines = [
    `#${pullRequest.number} ${pullRequest.title}`,
    url,
    `State: ${state}`,
    `Review: ${review}`,
    checks.length > 0 ? 'Checks:' : 'Checks: none',
    ...checks.map(
      (check) =>
        `  ${CHECK_STATES[check.state].padEnd(9)} ${check.context}` +
        (check.description ? ` - ${check.description}` : '') +
        (check.targetUrl ? ` ${check.targetUrl}` : '')
    ),
    `Preview: ${previewUrl ?? 'not ready'}`,
  ];

  return `${lines.join('\n')}\n`;
}

// `--body-file -` reads the body from standard input.
export async function readBody({ body, 'body-file': bodyFile }: ProjectPrCreateArgv) {
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

// The Redocly-hosted project of the `origin` remote and the checked-out branch.
async function readClone() {
  const remote = await runGit(['remote', 'get-url', 'origin'], { capture: true });
  const project = parseProjectGitUrl(remote.output);
  if (!project) {
    throw new HandledError(
      'Run this command in a clone of a Redocly-hosted project. Clone one with `redocly project clone`.'
    );
  }

  const { output: branch } = await runGit(['branch', '--show-current'], { capture: true });
  if (!branch) {
    throw new HandledError('Check out a branch first.');
  }

  return { project, branch };
}

async function readLoginToken(reuniteUrl: string, version: string) {
  const accessToken = await new RedoclyOAuthClient(version).getAccessToken(reuniteUrl);
  if (!accessToken) {
    throw new HandledError(
      `You are not logged in to ${reuniteUrl}. Run \`redocly login --residency ${reuniteUrl}\`.`
    );
  }

  return accessToken;
}

function pullRequestUrl({ reuniteUrl, organization, project }: HostedProject, number: number) {
  return `${reuniteUrl}/org/${encodeURIComponent(organization)}/project/${encodeURIComponent(project)}/pull-requests/${number}`;
}

function asHandledError(error: Error): never {
  throw new HandledError(error.message);
}
