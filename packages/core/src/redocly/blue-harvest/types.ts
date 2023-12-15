export type ProjectSourceResponse = {
  branchName: string;
  contentPath: string;
  isInternal: boolean;
};

export type UpsertRemoteResponse = {
  id: string;
  type: 'CICD';
  mountPath: string;
  mountBranchName: string;
  organizationId: string;
  projectId: string;
};

export type ListRemotesResponse = {
  object: 'list';
  page: {
    endCursor: string;
    startCursor: string;
    haxNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
    total: number;
  };
  items: Remote[];
};

export type Remote = {
  mountPath: string;
  type: string;
  autoSync: boolean;
  autoMerge: boolean;
  createdAt: string;
  updatedAt: string;
  providerType: string;
  namespaceId: string;
  repositoryId: string;
  projectId: string;
  mountBranchName: string;
  contentPath: string;
  credentialId: string;
  branchName: string;
  contentType: string;
  id: string;
};

export type PushResponse = {
  id: string;
  remoteId: string;
  commit: {
    message: string;
    branchName: string;
    sha: string | null;
    url: string | null;
    createdAt: string | null;
    namespace: string | null;
    repository: string | null;
    author: {
      name: string;
      email: string;
      image: string | null;
    };
  };
  remoteCommit: {
    branchName: string;
    commitSha: string | null;
    files: { path: string; mimeType: string }[];
  };
  hasChanges: boolean;
  isOutdated: boolean;
  isMainBranch: boolean;
  status: PushStatusResponse;
};

type DeploymentStatusResponse = {
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
  targetUrl: string;
};

export type PushStatusBase = 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';

// export type BuildStatus = PushStatusBase | 'NOT_STARTED' | 'QUEUED';

export type DeploymentStatus = 'NOT_STARTED' | 'SKIPPED' | PushStatusBase;
