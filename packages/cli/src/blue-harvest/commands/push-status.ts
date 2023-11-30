import { getDomain } from '../domains';
import { getApiKeys } from '../api-keys';

import { BlueHarvestApiClient, Config } from '@redocly/openapi-core';
import { exitWithError, printExecutionTime } from '../../utils';
import * as colors from 'colorette';
import { BaseStatus, PushStatusResponse, ScorecardItem } from 'core/src/redocly/blue-harvest/types';

export type PushStatusOptions = {
  organization: string;
  project: string;
  mountPath: string;
  pushId: string;
  domain?: string;
  config?: string;
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

    process.stderr.write(`\nProcessed push-status for ${colors.yellow(orgId)}, ${colors.yellow(projectId)} and mount path ${colors.yellow(mountPath)}.\n`);

    printPushStatus({
      ...pushStatus,
      scorecard: [
        {
          name: 'test',
          status: 'SUCCEEDED',
          description: 'test',
          targetUrl:
            'http://project-2--rem-cicd-rem-01hfphqss3xpe0a9ybk0b252dc-main.preview.localhost',
        },
        {
          name: 'test',
          status: 'SUCCEEDED',
          description: 'test',
          targetUrl:
            'http://project-2--rem-cicd-rem-01hfphqss3xpe0a9ybk0b252dc-main.preview.localhost',
        },
      ],
    });

    printExecutionTime(
      'push-status',
      startedAt,
      'Finished'
    );
  } catch (err) {
    exitWithError(`✗ Failed to get push status. Reason: ${err.message}\n`);
  }
}

function printPushStatus(pushStatus: PushStatusResponse) {    
  if ('build' in pushStatus && 'deployment' in pushStatus) {
    process.stderr.write(`\n${colors.blue('Build')}:\n 
    ${colors.magenta('Url')}: ${colors.cyan(pushStatus.build.url)}
    ${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(pushStatus.build.status)}\n\n`);

    process.stderr.write(`${colors.blue('Deploy')}:\n
    ${colors.magenta('Url')}: ${colors.cyan(pushStatus.deployment.url)}
    ${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(pushStatus.build.status)}\n`);

    if (pushStatus.build.status === 'SUCCEEDED' && pushStatus.deployment.status === 'SUCCEEDED') {
      process.stderr.write(
        `${colors.blue('Preview url')}: ${colors.cyan(pushStatus.previewUrl)} \n`
      );
    }

    if (pushStatus.scorecard.length) {
      printScorecard(pushStatus.scorecard);
    }
  } else {
    process.stderr.write(`Build for push is not started.Reason: ${pushStatus.status}\n`);
  }
}

function printScorecard(scorecard: ScorecardItem[]) {
  process.stderr.write(`\n${colors.blue('Scorecard')}:\n`);
  for (const scorecardItem of scorecard) {
    process.stderr.write(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(scorecardItem.status)}
    ${colors.magenta('Url')}: ${colors.cyan(scorecardItem.targetUrl)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
  }
}

function getDeploymentAndBuildStatuses(
  status: BaseStatus | 'NOT_STARTED' | 'QUEUED' | 'NO_CHANGES'
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
