import { getMostUrgentSunsetWarning, PlatformApi, type SunsetWarning } from './api/index.js';
import type { PushResponse } from './api/types.js';
import { resolveProjectRef, type ProjectRefResolution } from './resolve-project-ref.js';
import { retryUntilConditionMet } from './utils/retry-until-condition-met.js';

const DEFAULT_MAX_EXECUTION_TIME = 1200; // 20 min
const DEFAULT_RETRY_INTERVAL_MS = 5000; // 5 sec
const PENDING_DEPLOYMENT_STATUSES = ['pending', 'running'];

export type BuildType = 'preview' | 'production';

export type PushStatusOptions = {
  domain: string;
  // A function is called before each request, so that a short-lived key is renewed during a wait.
  apiKey: string | (() => Promise<string>);
  organization: string;
  project: string;
  pushId: string;
  version?: string;
  // Called once with the most urgent sunset warning the Redocly platform API sent, if any.
  onSunsetWarning?: (warning: SunsetWarning) => void;
  // Called when the organization or the project was given as a slug.
  onSlugDeprecated?: (resolution: ProjectRefResolution) => void;
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
  const sunsetWarnings: SunsetWarning[] = [];

  try {
    return await withClient(options, sunsetWarnings, async (client) =>
      getPush(client, await resolveProjectRef(client, options), options.pushId)
    );
  } finally {
    reportSunsetWarning(sunsetWarnings, options);
  }
}

export async function waitForDeployment({
  buildType,
  maxExecutionTime = DEFAULT_MAX_EXECUTION_TIME,
  retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
  startTime = Date.now(),
  onRetry,
  ...options
}: WaitForDeploymentOptions): Promise<PushResponse> {
  const sunsetWarnings: SunsetWarning[] = [];

  try {
    const ref = await withClient(options, sunsetWarnings, (client) =>
      resolveProjectRef(client, options)
    );

    return await retryUntilConditionMet({
      operation: () =>
        withClient(options, sunsetWarnings, (client) => getPush(client, ref, options.pushId)),
      condition: (result) =>
        !PENDING_DEPLOYMENT_STATUSES.includes(result.status[buildType].deploy.status),
      onConditionNotMet: onRetry,
      startTime,
      retryTimeoutMs: maxExecutionTime * 1000,
      retryIntervalMs,
    });
  } finally {
    reportSunsetWarning(sunsetWarnings, options);
  }
}

// Collects the sunset warning of the client whether the request succeeded or not.
async function withClient<T>(
  { domain, apiKey, version }: PushStatusOptions,
  sunsetWarnings: SunsetWarning[],
  run: (client: PlatformApi) => Promise<T>
): Promise<T> {
  const client = new PlatformApi({
    domain,
    apiKey: typeof apiKey === 'string' ? apiKey : await apiKey(),
    command: 'push-status',
    version,
  });

  try {
    return await run(client);
  } finally {
    const sunsetWarning = client.getSunsetWarning();

    if (sunsetWarning) {
      sunsetWarnings.push(sunsetWarning);
    }
  }
}

function reportSunsetWarning(
  sunsetWarnings: SunsetWarning[],
  { onSunsetWarning }: Pick<PushStatusOptions, 'onSunsetWarning'>
) {
  const sunsetWarning = getMostUrgentSunsetWarning(sunsetWarnings);

  if (sunsetWarning) {
    onSunsetWarning?.(sunsetWarning);
  }
}

function getPush(
  client: PlatformApi,
  { organizationId, projectId }: ProjectRefResolution,
  pushId: string
) {
  return client.remotes.getPush({ organizationId, projectId, pushId });
}
