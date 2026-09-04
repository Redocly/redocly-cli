import { handlePushStatus } from './reunite/commands/push-status.js';
import { handlePush } from './reunite/commands/push.js';

// The declaration file for this entry is generated from this file alone (see scripts/build.mjs),
// so every public type is declared here and the functions are declared instead of re-exported.

export type PushStatusBase = 'pending' | 'success' | 'running' | 'failed';

export type DeploymentStatus = 'skipped' | PushStatusBase;

export type ScorecardItem = {
  name: string;
  status: PushStatusBase;
  description: string;
  url: string;
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

export type PushOptions = {
  files: string[];
  organization: string;
  project: string;
  'mount-path': string;
  branch: string;
  author: string;
  message: string;
  'commit-sha'?: string;
  'commit-url'?: string;
  namespace?: string;
  repository?: string;
  'created-at'?: string;
  'default-branch': string;
  domain?: string;
  'wait-for-deployment'?: boolean;
  'max-execution-time'?: number; // in seconds
  'continue-on-deploy-failures'?: boolean;
  verbose?: boolean;
};

export type PushResult = { pushId: string };

export type PushStatusOptions = {
  organization: string;
  project: string;
  pushId: string;
  domain?: string;
  wait?: boolean;
  'max-execution-time'?: number; // in seconds
  'retry-interval'?: number; // in seconds
  'start-time'?: number; // in milliseconds
  'continue-on-deploy-failures'?: boolean;
  onRetry?: (lastSummary: PushStatusSummary) => void;
};

export type PushStatusSummary = {
  preview: DeploymentStatusResponse;
  production: DeploymentStatusResponse | null;
  commit: PushResponse['commit'];
};

export function push(options: PushOptions): Promise<PushResult | undefined> {
  return handlePush({ argv: options });
}

export function pushStatus(options: PushStatusOptions): Promise<PushStatusSummary> {
  return handlePushStatus({ argv: options });
}
