import { getDomain } from '../domains';
import { getApiKeys } from '../api-keys';

import { BlueHarvestApiClient, Config, PushStatusBase, ScorecardItem } from '@redocly/openapi-core';
import { exitWithError, printExecutionTime } from '../../utils';
import * as colors from 'colorette';

export type PushStatusOptions = {
  organization: string;
  project: string;
  pushId: string;
  domain?: string;
  config?: string;
  format?: 'stylish' | 'json';
};

export async function handlePushStatus(argv: PushStatusOptions, config: Config) {
  const startedAt = performance.now();

  const { organization, project: projectId, pushId } = argv;

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

    const push = await client.remotes.getPush({
      organizationId: orgId,
      projectId,
      pushId,
    });

    if (argv.format === 'stylish') {
      process.stderr.write(
        `\nProcessed push-status for ${colors.yellow(orgId)}, ${colors.yellow(
          projectId
        )} and pushID ${colors.yellow(pushId)}.\n\n`
      );

      if (push.isOutdated || !push.hasChanges) {
        process.stderr.write(
          `Files not uploaded. Reason: ${push.isOutdated ? 'outdated' : 'no changes'}.\n`
        );
      } else {
        process.stderr.write(
          `${colors.magenta('Status')}: ${getDeploymentAndBuildStatuses(
            push.status.preview.deploy.status
          )}\n\n`
        );

        if (push.status.preview.deploy.url) {
          process.stderr.write(
            `${colors.magenta('Preview URL')}: ${colors.cyan(push.status.preview.deploy.url)}\n`
          );
        }

        if (push.status.preview.scorecard.length) {
          printScorecard(push.status.preview.scorecard);
        }
      }

      printExecutionTime('push-status', startedAt, 'Finished');
    } else {
      process.stdout.write(`${JSON.stringify(push, null, 2)}\n`);
    }
  } catch (err) {
    exitWithError(`✗ Failed to get push status. Reason: ${err.message}\n`);
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
  status: PushStatusBase | 'NOT_STARTED' | 'QUEUED' | 'NO_CHANGES' | 'SKIPPED'
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
    case 'SKIPPED':
      return `${colors.yellow('Queued')}`;
    case 'NO_CHANGES':
      return `${colors.gray('No changes')}`;
    case 'IN_PROGRESS':
      return `${colors.gray('In progress')}`;
  }
}
