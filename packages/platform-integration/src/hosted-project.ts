import { BuildsApi, PullRequestsApi, ReuniteApiClient } from './api/api-client.js';
import { isValidReuniteUrl } from './api/domains.js';
import type { PullRequestCheck, PullRequestResponse } from './api/types.js';

const PROJECT_GIT_URL = /^(https?:\/\/[^/]+)\/api\/orgs\/([^/]+)\/projects\/([^/]+)\/git\/?$/;

export type HostedProject = { reuniteUrl: string; organization: string; project: string };

export type HostedProjectOptions = HostedProject & {
  // The access token of `redocly login`: pull requests and builds accept only a user session.
  accessToken: string;
  version?: string;
};

export type CreatePullRequestOptions = HostedProjectOptions & {
  branch: string;
  title: string;
  description?: string;
  // Defaults to the default branch of the project.
  base?: string;
  draft?: boolean;
};

export type PullRequestStatus = {
  pullRequest: PullRequestResponse;
  checks: PullRequestCheck[];
  // Set once the preview of the head commit is deployed.
  previewUrl?: string;
};

export function buildProjectGitUrl(reuniteUrl: string, organization: string, project: string) {
  return `${reuniteUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

// The parts of a URL built by `buildProjectGitUrl`; undefined for any other URL.
export function parseProjectGitUrl(url: string): HostedProject | undefined {
  const [, reuniteUrl, organization, project] = url.match(PROJECT_GIT_URL) ?? [];
  if (!reuniteUrl || !organization || !project || !isValidReuniteUrl(reuniteUrl)) {
    return undefined;
  }

  return {
    reuniteUrl,
    organization: decodeURIComponent(organization),
    project: decodeURIComponent(project),
  };
}

export async function createPullRequest({
  branch,
  title,
  description,
  base,
  draft,
  ...options
}: CreatePullRequestOptions): Promise<PullRequestResponse> {
  const { pullRequests } = createApis(options, 'project pr create');

  return pullRequests.create(options.organization, options.project, {
    branchName: branch,
    title,
    description,
    targetBranchName: base,
    isDraft: draft,
  });
}

// The latest pull request of `branch`; undefined when the branch has none.
export async function getPullRequestStatus({
  branch,
  ...options
}: HostedProjectOptions & { branch: string }): Promise<PullRequestStatus | undefined> {
  const { pullRequests, builds } = createApis(options, 'project pr status');
  const { organization, project } = options;
  const pullRequest = await pullRequests.findLatest(organization, project, branch);
  if (!pullRequest) {
    return undefined;
  }

  const [checks, build] = await Promise.all([
    pullRequests.listChecks(organization, project, pullRequest.id),
    pullRequest.headCommitHash
      ? builds.findLatestByCommit(organization, project, pullRequest.headCommitHash)
      : undefined,
  ]);

  return {
    pullRequest,
    checks,
    previewUrl: build?.deploymentStatus === 'SUCCESS' ? build.url : undefined,
  };
}

function createApis({ reuniteUrl, accessToken, version }: HostedProjectOptions, command: string) {
  const client = new ReuniteApiClient(command, version);
  const authHeaders = { Cookie: `accessToken=${accessToken}` };

  return {
    pullRequests: new PullRequestsApi(client, reuniteUrl, authHeaders),
    builds: new BuildsApi(client, reuniteUrl, authHeaders),
  };
}
