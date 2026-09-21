import { logger, pluralize, type OutputFormat } from '@redocly/openapi-core';
import {
  collectFilesToPush,
  getApiKeys,
  getDomain,
  pushFiles,
  type FileToUpload,
  type SunsetWarning,
} from '@redocly/reunite-integration';
import { green } from 'colorette';

import { printExecutionTime } from '../utils/miscellaneous.js';
import type { CommandArgs } from '../wrapper.js';
import { handlePushStatus, handleReuniteError, printSunsetWarning } from './push-status.js';

export type PushArgv = {
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
  'max-execution-time'?: number;
  'continue-on-deploy-failures'?: boolean;
  verbose?: boolean;
  format?: Extract<OutputFormat, 'stylish'>;
};

export async function handlePush({
  argv,
  config,
  version,
}: CommandArgs<PushArgv>): Promise<{ pushId: string } | void> {
  const startedAt = performance.now(); // for printing execution time
  const startTime = Date.now(); // for push-status command

  const { organization, project, 'mount-path': mountPath, verbose } = argv;
  const domain = argv.domain || getDomain();

  let files: FileToUpload[];
  let pushId: string;
  const sunsetWarnings: SunsetWarning[] = [];

  try {
    const apiKey = getApiKeys();
    files = collectFilesToPush(argv.files, (existingPath, replacementPath) => {
      logger.warn(`File ${existingPath} is overwritten by ${replacementPath}\n`);
    });

    if (!files.length) {
      return printExecutionTime('push', startedAt, `No files to upload`);
    }

    const push = await pushFiles({
      domain,
      apiKey,
      organization,
      project,
      mountPath,
      files,
      defaultBranch: argv['default-branch'],
      commit: {
        message: argv.message,
        branchName: argv.branch,
        sha: argv['commit-sha'],
        url: argv['commit-url'],
        createdAt: argv['created-at'],
        namespace: argv.namespace,
        repository: argv.repository,
        author: parseCommitAuthor(argv.author),
      },
      version,
      onUploadStart: (remote) => {
        logger.info(
          `Uploading to ${remote.mountPath} ${files.length} ${pluralize('file', files.length)}:\n`
        );
      },
      onSunsetWarning: (warning) => sunsetWarnings.push(warning),
    });
    pushId = push.pushId;
  } catch (err) {
    handleReuniteError('✗ File upload failed.', err);
  }

  for (const file of files) {
    logger.info(green(`✓ ${file.name}\n`));
  }
  logger.info('\n');
  logger.info(`Push ID: ${pushId}\n`);
  printSunsetWarning('push', sunsetWarnings);

  // The wait reports its own failures; they must not be rewritten as upload failures.
  if (argv['wait-for-deployment']) {
    logger.info('\n');

    await handlePushStatus({
      argv: {
        organization,
        project,
        pushId,
        wait: true,
        domain,
        'max-execution-time': argv['max-execution-time'],
        'start-time': startTime,
        'continue-on-deploy-failures': argv['continue-on-deploy-failures'],
      },
      config,
      version,
    });
  }
  if (verbose) {
    printExecutionTime(
      'push',
      startedAt,
      `${pluralize(
        'file',
        files.length
      )} uploaded to organization ${organization}, project ${project}. Push ID: ${pushId}.`
    );
  }

  return { pushId };
}

function parseCommitAuthor(author: string): { name: string; email: string } {
  // Author Name <author@email.com>
  const match = author.match(/^(?<name>.+)\s<(?<email>[^<>]+)>$/);

  if (!match?.groups) {
    throw new Error('Invalid author format. Use "Author Name <author@email.com>"');
  }

  return { name: match.groups.name.trim(), email: match.groups.email.trim() };
}
