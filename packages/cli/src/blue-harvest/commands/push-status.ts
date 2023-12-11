import { getDomain } from '../domains';
import { getApiKeys } from '../api-keys';

import {
  BlueHarvestApiClient,
  Config,
  PushStatusBase,
  PushStatusResponse,
  ScorecardItem,
} from '@redocly/openapi-core';
import { cleanColors, exitWithError, printExecutionTime } from '../../utils';
import * as colors from 'colorette';

export type PushStatusOptions = {
  organization: string;
  project: string;
  mountPath: string;
  pushId: string;
  domain?: string;
  config?: string;
  format?: 'stylish' | 'json';
};

export async function handlePushStatus(argv: PushStatusOptions, config: Config) {
  const startedAt = performance.now();

  const { organization, project: projectId, mountPath, pushId } = argv;

  const orgId = organization || config.organization;

  if (!orgId) {
    return exitWithError(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  }

  const domain = argv.domain || getDomain();

  if (!domain) {
    return exitWithError(
      `No domain provided, please use --domain option or environment variable REDOCLY_DOMAIN.`
    );
  }

  try {
    const apiKey = getApiKeys(domain);
    const client = new BlueHarvestApiClient(domain, apiKey);

    const remoteList = await client.remotes.getRemotesList(orgId, projectId, mountPath);

    if (!remoteList.items.length) {
      return exitWithError(
        `No remote found for mount path ${mountPath} in project ${projectId} in organization ${orgId}.`
      );
    }

    const remote = remoteList.items[0];

    const pushStatus = await client.remotes.getPushStatus({
      organizationId: orgId,
      projectId,
      pushId,
      remoteId: remote.id,
    });

    process.stderr.write(
      `\nProcessed push-status for ${colors.yellow(orgId)}, ${colors.yellow(
        projectId
      )} and mount path ${colors.yellow(mountPath)}.\n\n`
    );

    if (argv.format === 'stylish') {
      printPushStatus(pushStatus);
    } else {
      process.stdout.write(JSON.stringify(formatPushStatusToJson(pushStatus), null, 2));
    }

    printExecutionTime('push-status', startedAt, 'Finished');
  } catch (err) {
    exitWithError(`✗ Failed to get push status. Reason: ${err.message}\n`);
  }
}

function printPushStatus(pushStatusResponse: PushStatusResponse) {
  if (
    pushStatusResponse.status === 'CONTENT_OUTDATED' ||
    pushStatusResponse.status === 'NO_CHANGES' ||
    pushStatusResponse.status === 'PROCESSED'
  ) {
    process.stderr.write(`Push status is not processed. Reason: ${pushStatusResponse.status}.\n`);
    return;
  }

  process.stderr.write(
    `${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(pushStatusResponse.status)}\n\n`
  );

  if (pushStatusResponse.status === 'SUCCEEDED') {
    process.stderr.write(
      `${colors.magenta('Preview URL')}: ${colors.cyan(pushStatusResponse.buildUrlLogs)}\n`
    );
  } else {
    process.stderr.write(
      `${colors.magenta('Build url logs')}: ${colors.cyan(pushStatusResponse.buildUrlLogs)}\n`
    );
  }

  if (
    pushStatusResponse.status === 'SUCCEEDED' &&
    pushStatusResponse.deploymentStatus === 'SUCCEEDED'
  ) {
    process.stderr.write(`${colors.blue('URL')}: ${colors.cyan(pushStatusResponse.url)}\n`);
  }

  if (pushStatusResponse.scorecard.length) {
    printScorecard(pushStatusResponse.scorecard);
  }
}

function printScorecard(scorecard: ScorecardItem[]) {
  process.stderr.write(`\n${colors.magenta('Scorecard')}:\n`);
  for (const scorecardItem of scorecard) {
    process.stderr.write(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(scorecardItem.status)}
    ${colors.magenta('URL')}: ${colors.cyan(scorecardItem.targetUrl)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
  }
}

function getDeploymentAndBuildStatuses(
  status: PushStatusBase | 'NOT_STARTED' | 'QUEUED' | 'NO_CHANGES'
) {
  switch (status) {
    case 'SUCCEEDED':
      return `${colors.green('Success')}`;
    case 'FAILED':
      return `${colors.red('Failed')}`;
    case 'NOT_STARTED':
      return `${colors.gray('Not started')}`;
    case 'QUEUED':
      return `${colors.yellow('Queued')}`;
    case 'NO_CHANGES':
      return `${colors.gray('No changes')}`;
    case 'IN_PROGRESS':
      return `${colors.gray('In progress')}`;
  }
}

function formatPushStatusToJson(pushStatusResponse: PushStatusResponse) {
  if (
    pushStatusResponse.status === 'CONTENT_OUTDATED' ||
    pushStatusResponse.status === 'NO_CHANGES' ||
    pushStatusResponse.status === 'PROCESSED'
  ) {
    return {
      status: pushStatusResponse.status,
    };
  }

  return {
    status: cleanColors(getDeploymentAndBuildStatuses(pushStatusResponse.status)),
    buildUrlLogs: pushStatusResponse.buildUrlLogs,
    ...(pushStatusResponse.status === 'SUCCEEDED' &&
      pushStatusResponse.deploymentStatus === 'SUCCEEDED' && { url: pushStatusResponse.url }),
    ...(pushStatusResponse.scorecard.length && {
      scorecard: pushStatusResponse.scorecard.map((item) => ({
        name: item.name,
        status: cleanColors(getDeploymentAndBuildStatuses(item.status)),
        description: item.description,
        url: item.targetUrl,
      })),
    }),
  };
}
