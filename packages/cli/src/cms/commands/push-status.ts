import * as colors from 'colorette';
import { RedoclyCloudApiClient, Config, ScorecardItem } from '@redocly/openapi-core';
import type { DeploymentStatus, PushResponse } from '@redocly/openapi-core/lib/redocly/cloud/types';
import { getDomain } from '../domains';
import { getApiKeys } from '../api-keys';
import { exitWithError, printExecutionTime } from '../../utils';
import { Spinner } from '../../spinner';
import { DeploymentError } from '../utils';
import { yellow } from 'colorette';

const INTERVAL = 5000;

export type PushStatusOptions = {
  organization: string;
  project: string;
  pushId: string;
  domain?: string;
  config?: string;
  format?: 'stylish' | 'json';
  wait?: boolean;
  'max-execution-time': number;
};

export async function handlePushStatus(argv: PushStatusOptions, config: Config) {
  const startedAt = performance.now();
  const spinner = new Spinner();

  const { organization, project: projectId, pushId, wait } = argv;

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
    const client = new RedoclyCloudApiClient(domain, apiKey);

    if (!wait) {
      const pushPreview = await getAndPrintPushStatus(client, 'preview');
      printScorecard(pushPreview.status.preview.scorecard);

      if (pushPreview.isMainBranch) {
        await getAndPrintPushStatus(client, 'production');
        printScorecard(pushPreview.status.production.scorecard);
      }

      printPushStatusInfo();
      return;
    }

    const push = await waitForDeployment(client, 'preview');

    if (push.isMainBranch && push.status.preview.deploy.status === 'success') {
      await waitForDeployment(client, 'production');
    }

    printPushStatusInfo();
  } catch (err) {
    const message =
      err instanceof DeploymentError
        ? err.message
        : `✗ Failed to get push status. Reason: ${err.message}\n`;
    exitWithError(message);
  }

  function printPushStatusInfo() {
    process.stderr.write(
      `\nProcessed push-status for ${colors.yellow(orgId!)}, ${colors.yellow(
        projectId
      )} and pushID ${colors.yellow(pushId)}.\n`
    );
    printExecutionTime('push-status', startedAt, 'Finished');
  }

  async function waitForDeployment(
    client: RedoclyCloudApiClient,
    buildType: 'preview' | 'production'
  ): Promise<PushResponse> {
    return new Promise((resolve, reject) => {
      if (performance.now() - startedAt > argv['max-execution-time'] * 1000) {
        spinner.stop();
        reject(new Error(`Time limit exceeded.`));
      }

      getAndPrintPushStatus(client, buildType)
        .then((push) => {
          if (!['pending', 'running'].includes(push.status[buildType].deploy.status)) {
            printScorecard(push.status[buildType].scorecard);
            resolve(push);
            return;
          }

          setTimeout(async () => {
            try {
              const pushResponse = await waitForDeployment(client, buildType);
              resolve(pushResponse);
            } catch (e) {
              reject(e);
            }
          }, INTERVAL);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async function getAndPrintPushStatus(
    client: RedoclyCloudApiClient,
    buildType: 'preview' | 'production'
  ) {
    // { hasChanges: true, status: {preview: {deploy: {status: 'failed', url: 'https://app.lab1.blueharvest.cloud/'}}}} as PushResponse;
    const push = await client.remotes.getPush({
      organizationId: orgId!,
      projectId,
      pushId,
    });

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
        wait,
      });
    }

    return push;
  }
}

function printScorecard(scorecard: ScorecardItem[]) {
  if (!scorecard.length) {
    return;
  }
  process.stdout.write(`\n${colors.magenta('Scorecard')}:`);
  for (const scorecardItem of scorecard) {
    process.stdout.write(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${scorecardItem.status}
    ${colors.magenta('URL')}: ${colors.cyan(scorecardItem.targetUrl)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
  }
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
        `${colors.green(
          `🚀 ${buildType.toLocaleUpperCase()} deployment succeeded.`
        )}\n${colors.magenta('Preview URL')}: ${colors.cyan(previewUrl!)}\n`
      );
    case 'failed':
      spinner.stop();
      throw new DeploymentError(
        `${colors.red(`❌ ${buildType.toLocaleUpperCase()} deployment failed.`)}\n${colors.magenta(
          'Preview URL'
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
