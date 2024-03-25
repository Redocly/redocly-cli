import * as colors from 'colorette';
import { yellow } from 'colorette';
import { Config, OutputFormat } from '@redocly/openapi-core';

import { exitWithError, printExecutionTime } from '../../utils/miscellaneous';
import { Spinner } from '../../utils/spinner';
import { DeploymentError } from '../utils';
import { ReuniteApiClient, getApiKeys, getDomain } from '../api';
import { capitalize } from '../../utils/js-utils';
import type { DeploymentStatus, PushResponse, ScorecardItem } from '../api/types';
import { retryUntilConditionMet } from './utils';

const RETRY_INTERVAL = 5000; // ms

export type PushStatusOptions = {
  organization: string;
  project: string;
  pushId: string;
  domain?: string;
  config?: string;
  format?: Extract<OutputFormat, 'stylish' | 'json'>;
  wait?: boolean;
  'max-execution-time'?: number;
  onRetry?: (lastResult: PushResponse) => void;
};

export interface DeploymentMetadata {
  status: DeploymentStatus;
  url?: string;
  scorecard: ScorecardItem[];
  isOutdated: boolean;
  noChanges: boolean;
}

export interface PushStatusSummary {
  preview: DeploymentMetadata;
  production?: DeploymentMetadata;
}

export async function handlePushStatus(
  argv: PushStatusOptions,
  config: Config
): Promise<PushStatusSummary | undefined> {
  const startedAt = performance.now();
  const spinner = new Spinner();

  const { organization, project: projectId, pushId, wait, format } = argv;

  const orgId = organization || config.organization;

  if (!orgId) {
    exitWithError(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
    return;
  }

  const domain = argv.domain || getDomain();
  const maxExecutionTime = argv['max-execution-time'] || 600;
  const retryTimeout = maxExecutionTime * 1000;

  try {
    const apiKey = getApiKeys(domain);
    const client = new ReuniteApiClient(domain, apiKey);

    const previewPushData = await getPushData({
      orgId,
      projectId,
      pushId,
      wait,
      client,
      buildType: 'preview',
      retryTimeout,
      onRetry: (lastResult) => {
        format === 'stylish' &&
          displayDeploymentAndBuildStatus({
            status: lastResult.status['preview'].deploy.status,
            previewUrl: lastResult.status['preview'].deploy.url,
            spinner,
            buildType: 'preview',
            wait,
          });
        argv?.onRetry?.(lastResult);
      },
    });

    if (format === 'stylish') {
      printPushStatus({ buildType: 'preview', spinner, wait, push: previewPushData });
      printScorecard(previewPushData.status.preview.scorecard);
    }

    const fetchProdPushDatCondition =
      previewPushData.isMainBranch &&
      (wait ? previewPushData.status.preview.deploy.status === 'success' : true);

    const prodPushData = fetchProdPushDatCondition
      ? await getPushData({
          orgId,
          projectId,
          pushId,
          wait,
          client,
          buildType: 'production',
          retryTimeout,
          onRetry: (lastResult) => {
            format === 'stylish' &&
              displayDeploymentAndBuildStatus({
                status: lastResult.status['production'].deploy.status,
                previewUrl: lastResult.status['production'].deploy.url,
                spinner,
                buildType: 'production',
                wait,
              });
            argv?.onRetry?.(lastResult);
          },
        })
      : null;

    if (format === 'stylish') {
      printPushStatus({ buildType: 'production', spinner, wait, push: prodPushData });
      printScorecard(prodPushData?.status?.production?.scorecard);
      printPushStatusInfo({ orgId, projectId, pushId, startedAt });
    }

    const summary: PushStatusSummary = {
      preview: {
        status: previewPushData.status.preview.deploy.status,
        url: previewPushData.status.preview.deploy.url || undefined,
        scorecard: previewPushData.status.preview.scorecard,
        isOutdated: previewPushData.isOutdated,
        noChanges: !previewPushData.hasChanges,
      },
      production:
        previewPushData.status.preview.deploy.status !== 'failed' &&
        prodPushData?.status?.production
          ? {
              status: prodPushData.status.production.deploy.status,
              url: prodPushData.status.production.deploy.url || '',
              scorecard: prodPushData.status.production.scorecard,
              isOutdated: prodPushData.isOutdated,
              noChanges: !prodPushData.hasChanges,
            }
          : undefined,
    };

    if (format === 'json') {
      process.stdout.write(JSON.stringify(summary) + '\n');

      if (summary.preview.status === 'failed') {
        process.stdout.write('\n');
        throw new DeploymentError(`${colors.red(`❌ Preview deploy failed.`)}`);
      }

      if (summary?.production?.status === 'failed') {
        process.stdout.write('\n');
        throw new DeploymentError(`${colors.red(`❌ Production deploy failed.`)}`);
      }
    }
    return summary;
  } catch (err) {
    const message =
      err instanceof DeploymentError
        ? err.message
        : `✗ Failed to get push status. Reason: ${err.message}\n`;
    exitWithError(message);
    return;
  }
}

function printPushStatusInfo({
  orgId,
  projectId,
  pushId,
  startedAt,
}: {
  orgId: string;
  projectId: string;
  pushId: string;
  startedAt: number;
}) {
  process.stderr.write(
    `\nProcessed push-status for ${colors.yellow(orgId!)}, ${colors.yellow(
      projectId
    )} and pushID ${colors.yellow(pushId)}.\n`
  );
  printExecutionTime('push-status', startedAt, 'Finished');
}

async function getPushData({
  orgId,
  projectId,
  pushId,
  wait,
  client,
  buildType,
  retryTimeout,
  onRetry,
}: {
  orgId: string;
  projectId: string;
  pushId: string;
  wait?: boolean;
  client: ReuniteApiClient;
  buildType: 'preview' | 'production';
  retryTimeout: number;
  onRetry?: (lastResult: PushResponse) => void;
}): Promise<PushResponse> {
  const pushData = await retryUntilConditionMet<PushResponse>({
    operation: () =>
      client.remotes.getPush({
        organizationId: orgId!,
        projectId,
        pushId,
      }),
    condition: (result: PushResponse) =>
      wait ? !['pending', 'running'].includes(result.status[buildType].deploy.status) : true,
    onRetry,
    retryTimeout: retryTimeout,
    retryInterval: RETRY_INTERVAL,
  });

  return pushData;
}

function printPushStatus({
  buildType,
  spinner,
  push,
}: {
  buildType: 'preview' | 'production';
  spinner: Spinner;
  wait?: boolean;
  push?: PushResponse | null;
}) {
  if (!push) {
    return;
  }
  if (push.isOutdated || !push.hasChanges) {
    process.stderr.write(
      yellow(`Files not uploaded. Reason: ${push.isOutdated ? 'outdated' : 'no changes'}.\n`)
    );
  } else {
    displayDeploymentAndBuildStatus({
      status: push.status[buildType].deploy.status,
      previewUrl: push.status[buildType].deploy.url,
      buildType,
      spinner,
    });
  }
}

function printScorecard(scorecard?: ScorecardItem[]) {
  if (!scorecard || !scorecard.length) {
    return;
  }
  process.stdout.write(`\n${colors.magenta('Scorecard')}:`);
  for (const scorecardItem of scorecard) {
    process.stdout.write(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${scorecardItem.status}
    ${colors.magenta('URL')}: ${colors.cyan(scorecardItem.url)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
  }
  process.stdout.write(`\n`);
}

function displayDeploymentAndBuildStatus({
  status,
  previewUrl,
  spinner,
  buildType,
  wait,
}: {
  status: DeploymentStatus;
  previewUrl: string | null;
  spinner: Spinner;
  buildType: 'preview' | 'production';
  wait?: boolean;
}) {
  switch (status) {
    case 'success':
      spinner.stop();
      return process.stdout.write(
        `${colors.green(`🚀 ${capitalize(buildType)} deploy succeed.`)}\n${colors.magenta(
          `${capitalize(buildType)} URL`
        )}: ${colors.cyan(previewUrl!)}\n`
      );
    case 'failed':
      spinner.stop();
      throw new DeploymentError(
        `${colors.red(`❌ ${capitalize(buildType)} deploy failed.`)}\n${colors.magenta(
          `${capitalize(buildType)} URL`
        )}: ${colors.cyan(previewUrl!)}`
      );
    case 'pending':
      return wait
        ? spinner.start(`${colors.yellow(`Pending ${buildType}`)}`)
        : process.stdout.write(`Status: ${colors.yellow(`Pending ${buildType}`)}\n`);
    case 'skipped':
      spinner.stop();
      return process.stdout.write(`${colors.yellow(`Skipped ${buildType}`)}\n`);
    case 'running':
      return wait
        ? spinner.start(`${colors.yellow(`Running ${buildType}`)}`)
        : process.stdout.write(`Status: ${colors.yellow(`Running ${buildType}`)}\n`);
  }
}
