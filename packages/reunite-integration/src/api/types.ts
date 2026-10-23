export type ProjectResponse = {
  id: string;
  slug: string;
  name: string;
  // Canonical self-link: `${domain}/api/orgs/{organizationId}/projects/{id}`.
  uri: string;
};

export type ProjectSourceResponse = {
  branchName: string;
  contentPath: string;
  isInternal: boolean;
};

export type ProjectSourcesListResponse = {
  object: 'list';
  page: { nextPage: string | null; previousPage: string | null; limit: number };
  data: ProjectSourceResponse[];
};

export type UpsertRemoteResponse = {
  id: string;
  type: 'CICD';
  mountPath: string;
  mountBranchName: string;
  organizationId: string;
  projectId: string;
};

export type PushResponse = {
  id: string;
  remoteId: string;
  isMainBranch: boolean;
  isOutdated: boolean;
  hasChanges: boolean;
  replace: boolean;
  scoutJobId: string | null;
  uploadedFiles: Array<{ path: string; mimeType: string }>;
  commit: {
    branchName: string;
    message: string;
    createdAt: string | null;
    namespaceId: string | null;
    repositoryId: string | null;
    url: string | null;
    sha: string | null;
    author: {
      name: string;
      email: string;
      image: string | null;
    };
    statuses: Array<{
      name: string;
      description: string;
      status: 'pending' | 'running' | 'success' | 'failed';
      url: string | null;
    }>;
  };
  remote: {
    commits: {
      sha: string;
      branchName: string;
    }[];
  };
  status: PushStatusResponse;
};

export type DeploymentStatusResponse = {
  deploy: {
    url: string | null;
    status: DeploymentStatus;
  };
  scorecard: ScorecardItem[];
};

export type PushStatusResponse = {
  preview: DeploymentStatusResponse;
  production: DeploymentStatusResponse;
};

export type ScorecardItem = {
  name: string;
  status: PushStatusBase;
  description: string;
  url: string;
};

export type PushStatusBase = 'pending' | 'success' | 'running' | 'failed';

export type DeploymentStatus = 'skipped' | PushStatusBase;

export type CreatePullRequestPayload = {
  branchName: string;
  title: string;
  description?: string;
  // Defaults to the default branch of the project.
  targetBranchName?: string;
  isDraft?: boolean;
};

export type PullRequestResponse = {
  id: string;
  number: number;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft?: boolean;
  reviewDecision?: 'APPROVED' | 'REQUESTED_CHANGES' | 'REVIEW_REQUIRED';
  headCommitHash?: string;
};

export type PullRequestCheck = {
  context: string;
  state: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  description?: string;
  targetUrl?: string;
};

export type ProjectBuildResponse = {
  url: string;
  deploymentStatus: 'NOT_STARTED' | 'SKIPPED' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
};
