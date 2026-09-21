import { capitalize, HandledError, logger, type OutputFormat } from '@redocly/openapi-core';
import {
  getApiKeys,
  getDomain,
  getMostUrgentSunsetWarning,
  getPushStatus,
  ReuniteApiError,
  waitForDeployment,
  type BuildType,
  type DeploymentStatus,
  type DeploymentStatusResponse,
  type PushResponse,
  type ScorecardItem,
  type SunsetWarning,
} from '@redocly/reunite-integration';
import * as colors from 'colorette';

import { printExecutionTime } from '../utils/miscellaneous.js';
import { Spinner } from '../utils/spinner.js';
import type { CommandArgs } from '../wrapper.js';

export type PushStatusArgv = {
  organization: string;
  project: string;
  pushId: string;
  domain?: string;
  format?: Extract<OutputFormat, 'stylish'>;
  wait?: boolean;
  'max-execution-time'?: number; // in seconds
  'retry-interval'?: number; // in seconds
  'start-time'?: number; // in milliseconds
  'continue-on-deploy-failures'?: boolean;
};

export interface PushStatusSummary {
  preview: DeploymentStatusResponse;
  production: DeploymentStatusResponse | null;
  commit: PushResponse['commit'];
}

export class DeploymentError extends Error {}

export async function handlePushStatus({
  argv,
  version,
}: CommandArgs<PushStatusArgv>): Promise<PushStatusSummary | void> {
  const startedAt = performance.now();
  const spinner = new Spinner();

  const { organization, project, pushId, wait } = argv;
  const domain = argv.domain || getDomain();
  const continueOnDeployFailures = argv['continue-on-deploy-failures'] || false;
  // Shared by the preview and production waits, so both fit in one max-execution-time window.
  const startTime = argv['start-time'] || Date.now();

  try {
    const apiKey = getApiKeys();
    // Both waits may report a sunset warning; it is printed once at the end.
    const sunsetWarnings: SunsetWarning[] = [];
    const statusOptions = {
      domain,
      apiKey,
      organization,
      project,
      pushId,
      version,
      onSunsetWarning: (warning: SunsetWarning) => sunsetWarnings.push(warning),
    };
    const waitOptions = {
      ...statusOptions,
      maxExecutionTime: argv['max-execution-time'],
      retryIntervalMs: argv['retry-interval'] ? argv['retry-interval'] * 1000 : undefined,
      startTime,
    };
    const showProgress = (buildType: BuildType) => (pendingPush: PushResponse) => {
      const { status, url } = pendingPush.status[buildType].deploy;
      spinner.start(getMessage({ status, url, buildType, wait }));
    };

    let push = wait
      ? await waitForDeployment({
          ...waitOptions,
          buildType: 'preview',
          onRetry: showProgress('preview'),
        })
      : await getPushStatus(statusOptions);

    printPushStatus({ buildType: 'preview', spinner, push, continueOnDeployFailures });
    printScorecard(push.status.preview.scorecard);

    if (wait && push.isMainBranch && push.status.preview.deploy.status === 'success') {
      push = await waitForDeployment({
        ...waitOptions,
        buildType: 'production',
        onRetry: showProgress('production'),
      });
    }

    if (push.isMainBranch) {
      printPushStatus({ buildType: 'production', spinner, push, continueOnDeployFailures });
      printScorecard(push.status.production.scorecard);
    }
    printPushStatusInfo({ organization, project, pushId, startedAt });
    printSunsetWarning('push-status', sunsetWarnings);

    return {
      preview: push.status.preview,
      production: push.isMainBranch ? push.status.production : null,
      commit: push.commit,
    };
  } catch (err) {
    spinner.stop(); // Spinner can block process exit, so we need to stop it explicitly.

    handleReuniteError('✗ Failed to get push status.', err);
  } finally {
    spinner.stop(); // Spinner can block process exit, so we need to stop it explicitly.
  }
}

export function handleReuniteError(
  message: string,
  error: ReuniteApiError | DeploymentError | Error
): never {
  if (error instanceof DeploymentError) {
    throw new HandledError(error.message);
  }

  if (error instanceof ReuniteApiError) {
    throw new HandledError(`${message} Reason: ${error.message} (status: ${error.status})\n`);
  }

  throw new HandledError(`${message} Reason: ${error.message}\n`);
}

// Prints the most urgent of the sunset warnings a command collected, once.
export function printSunsetWarning(
  command: 'push' | 'push-status',
  sunsetWarnings: SunsetWarning[]
): void {
  const sunsetWarning = getMostUrgentSunsetWarning(sunsetWarnings);

  if (!sunsetWarning) {
    return;
  }

  const updateVersionMessage = `Update to the latest version by running "npm install @redocly/cli@latest".`;

  if (sunsetWarning.isSunsetExpired) {
    logger.error(
      `The "${command}" command is not compatible with your version of Redocly CLI. ${updateVersionMessage}\n\n`
    );
  } else {
    logger.warn(
      `The "${command}" command will be incompatible with your version of Redocly CLI after ${sunsetWarning.sunsetDate.toLocaleString()}. ${updateVersionMessage}\n\n`
    );
  }
}

function printPushStatusInfo({
  organization,
  project,
  pushId,
  startedAt,
}: {
  organization: string;
  project: string;
  pushId: string;
  startedAt: number;
}) {
  logger.info(
    `\nProcessed push-status for ${colors.yellow(organization)}, ${colors.yellow(
      project
    )} and pushID ${colors.yellow(pushId)}.\n`
  );
  printExecutionTime('push-status', startedAt, 'Finished');
}

function printPushStatus({
  buildType,
  spinner,
  push,
  continueOnDeployFailures,
}: {
  buildType: BuildType;
  spinner: Spinner;
  push: PushResponse;
  continueOnDeployFailures: boolean;
}) {
  if (push.isOutdated || !push.hasChanges) {
    logger.warn(
      `Files not added to your project. Reason: ${push.isOutdated ? 'outdated' : 'no changes'}.\n`
    );
  } else {
    displayDeploymentAndBuildStatus({
      status: push.status[buildType].deploy.status,
      url: push.status[buildType].deploy.url,
      buildType,
      spinner,
      continueOnDeployFailures,
    });
  }
}

function printScorecard(scorecard?: ScorecardItem[]) {
  if (!scorecard || scorecard.length === 0) {
    return;
  }
  logger.output(`\n${colors.magenta('Scorecard')}:`);
  for (const scorecardItem of scorecard) {
    logger.output(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${scorecardItem.status}
    ${colors.magenta('URL')}: ${colors.cyan(scorecardItem.url)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
  }
  logger.output(`\n`);
}

function displayDeploymentAndBuildStatus({
  status,
  url,
  spinner,
  buildType,
  continueOnDeployFailures,
}: {
  status: DeploymentStatus;
  url: string | null;
  spinner: Spinner;
  buildType: BuildType;
  continueOnDeployFailures: boolean;
}) {
  const message = getMessage({ status, url, buildType });

  spinner.stop();

  if (status === 'failed' && !continueOnDeployFailures) {
    throw new DeploymentError(message);
  }

  logger.output(message);
}

function getMessage({
  status,
  url,
  buildType,
  wait,
}: {
  status: DeploymentStatus;
  url: string | null;
  buildType: BuildType;
  wait?: boolean;
}): string {
  switch (status) {
    case 'skipped':
      return `${colors.yellow(`Skipped ${buildType}`)}\n`;

    case 'pending': {
      const message = `${colors.yellow(`Pending ${buildType}`)}`;
      return wait ? message : `Status: ${message}\n`;
    }
    case 'running': {
      const message = `${colors.yellow(`Running ${buildType}`)}`;
      return wait ? message : `Status: ${message}\n`;
    }
    case 'success':
      return `${colors.green(`🚀 ${capitalize(buildType)} deploy success.`)}\n${colors.magenta(
        `${capitalize(buildType)} URL`
      )}: ${colors.cyan(url || 'No URL yet.')}\n`;

    case 'failed':
      return `${colors.red(`❌ ${capitalize(buildType)} deploy fail.`)}\n${colors.magenta(
        `${capitalize(buildType)} URL`
      )}: ${colors.cyan(url || 'No URL yet.')}`;

    default: {
      const message = `${colors.yellow(`No status yet for ${buildType} deploy`)}`;

      return wait ? message : `Status: ${message}\n`;
    }
  }
}
