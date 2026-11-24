import {
  BuildsApi,
  OrganizationsApi,
  PlatformApi,
  PlatformApiError,
  ProjectsApi,
  PullRequestsApi,
  PlatformApiClient,
} from './api/api-client.js';
import { createAuthHeaders, type PlatformCredentials } from './api/auth-headers.js';
import { isValidPlatformUrl } from './api/domains.js';
import type { PullRequestCheck, PullRequestResponse } from './api/types.js';
import { resolveProjectRef } from './resolve-project-ref.js';

const PROJECT_GIT_URL = /^(https?:\/\/[^/]+)\/api\/orgs\/([^/]+)\/projects\/([^/]+)\/git\/?$/;

export type HostedProject = { platformUrl: string; organization: string; project: string };

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

// `organization` and `project` are ids; the slugs address the project in the Redocly platform UI.
export type ResolvedHostedProject = HostedProject & {
  organizationSlug: string;
  projectSlug: string;
};

export type PullRequestStatus = {
  pullRequest: PullRequestResponse;
  checks: PullRequestCheck[];
  // Set once the preview of the head commit is deployed.
  previewUrl?: string;
};

export function buildProjectGitUrl(platformUrl: string, organization: string, project: string) {
  return `${platformUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

// The parts of a URL built by `buildProjectGitUrl`; undefined for any other URL.
export function parseProjectGitUrl(url: string): HostedProject | undefined {
  const [, platformUrl, organization, project] = url.match(PROJECT_GIT_URL) ?? [];
  if (!platformUrl || !organization || !project || !isValidPlatformUrl(platformUrl)) {
    return undefined;
  }

  return {
    platformUrl,
    organization: decodeURIComponent(organization),
    project: decodeURIComponent(project),
  };
}

// `organization` and `project` may be ids or slugs. Keeps the given values when the credentials
// are not allowed to look the project up, as push does.
export async function resolveProjectIds({
  platformUrl,
  organization,
  project,
  version,
  ...credentials
}: HostedProject & PlatformCredentials & { version?: string }): Promise<HostedProject> {
  const client = new PlatformApi({
    domain: platformUrl,
    command: 'project clone',
    version,
    ...credentials,
  });
  const { organizationId, projectId } = await resolveProjectRef(client, { organization, project });

  return { platformUrl, organization: organizationId, project: projectId };
}

// `organization` and `project` may be ids or slugs.
export async function resolveHostedProject({
  command,
  ...options
}: HostedProjectOptions & { command: string }): Promise<ResolvedHostedProject> {
  const { platformUrl, organization, project } = options;
  const { organizations, projects } = createApis(options, command);
  const [foundOrganization, foundProject] = await Promise.all([
    organizations.find(organization),
    projects.find(organization, project),
  ]);
  if (!foundProject) {
    throw new PlatformApiError(
      `Project "${project}" was not found in organization "${organization}".`,
      404
    );
  }

  return {
    platformUrl,
    organization: foundOrganization.id,
    project: foundProject.id,
    organizationSlug: foundOrganization.slug,
    projectSlug: foundProject.slug,
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

function createApis({ platformUrl, accessToken, version }: HostedProjectOptions, command: string) {
  const client = new PlatformApiClient(command, version);
  const authHeaders = createAuthHeaders({ accessToken });

  return {
    organizations: new OrganizationsApi(client, platformUrl, authHeaders),
    projects: new ProjectsApi(client, platformUrl, authHeaders),
    pullRequests: new PullRequestsApi(client, platformUrl, authHeaders),
    builds: new BuildsApi(client, platformUrl, authHeaders),
  };
}
