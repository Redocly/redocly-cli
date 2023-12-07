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
  branchName: string;
  hasChanges: boolean;
  commitSha: string;
  outdated: boolean;
  pushStatusId: string;
};

export type PushStatusResponse = {
  status: BuildStatus | PushCommandStatusState;
  deploymentStatus: DeploymentStatus;
  url: string;
  scorecard: ScorecardItem[];
  buildUrlLogs: string;
};

export type PushCommandStatusState = 'NOT_STARTED' | 'NO_CHANGES' | 'CONTENT_OUTDATED' | 'PROCESSED';

export type ScorecardItem = {
  name: string;
  status: PushStatusBase;
  description: string;
  targetUrl: string;
};

export type PushStatusBase = 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';

export type BuildStatus = PushStatusBase | 'NOT_STARTED' | 'QUEUED';

export type DeploymentStatus = 'NOT_STARTED' | 'SKIPPED' | PushStatusBase;
