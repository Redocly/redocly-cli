import { ReuniteApi } from './api/index.js';
import type { PushResponse } from './api/types.js';
import { retryUntilConditionMet } from './utils/retry-until-condition-met.js';

const DEFAULT_MAX_EXECUTION_TIME = 1200; // 20 min
const DEFAULT_RETRY_INTERVAL_MS = 5000; // 5 sec
const PENDING_DEPLOYMENT_STATUSES = ['pending', 'running'];

export type BuildType = 'preview' | 'production';

export type PushStatusOptions = {
  domain: string;
  apiKey: string;
  organization: string;
  project: string;
  pushId: string;
  version?: string;
};

export type WaitForDeploymentOptions = PushStatusOptions & {
  buildType: BuildType;
  maxExecutionTime?: number; // in seconds
  retryIntervalMs?: number;
  startTime?: number; // in milliseconds
  // Called with the latest push while the deployment is still pending, before the next poll.
  onRetry?: (push: PushResponse) => void | Promise<void>;
};

export async function getPushStatus(options: PushStatusOptions): Promise<PushResponse> {
  const client = createClient(options);
  const push = await getPush(client, options);

  client.reportSunsetWarnings();

  return push;
}

export async function waitForDeployment({
  buildType,
  maxExecutionTime = DEFAULT_MAX_EXECUTION_TIME,
  retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
  startTime = Date.now(),
  onRetry,
  ...options
}: WaitForDeploymentOptions): Promise<PushResponse> {
  const client = createClient(options);
  const push = await retryUntilConditionMet({
    operation: () => getPush(client, options),
    condition: (result) =>
      !PENDING_DEPLOYMENT_STATUSES.includes(result.status[buildType].deploy.status),
    onConditionNotMet: onRetry,
    startTime,
    retryTimeoutMs: maxExecutionTime * 1000,
    retryIntervalMs,
  });

  client.reportSunsetWarnings();

  return push;
}

function createClient({ domain, apiKey, version }: PushStatusOptions) {
  return new ReuniteApi({ domain, apiKey, command: 'push-status', version });
}

function getPush(client: ReuniteApi, { organization, project, pushId }: PushStatusOptions) {
  return client.remotes.getPush({ organizationId: organization, projectId: project, pushId });
}
