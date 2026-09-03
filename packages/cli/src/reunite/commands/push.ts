import { slash, pluralize, logger, type OutputFormat } from '@redocly/openapi-core';
import { green } from 'colorette';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { PushOptions, PushResult } from '../../api.js';
import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { ReuniteApi, getDomain, getApiKeys } from '../api/index.js';
import { pushStatus } from './push-status.js';
import { handleReuniteError } from './utils.js';

export type PushArgv = PushOptions & {
  format?: Extract<OutputFormat, 'stylish'>;
} & VerifyConfigOptions;

type FileToUpload = { name: string; path: string };

export function handlePush({ argv }: CommandArgs<PushArgv>) {
  return push(argv);
}

export async function push(options: PushOptions): Promise<PushResult | undefined> {
  const startedAt = performance.now(); // for printing execution time
  const startTime = Date.now(); // for push-status command

  const { organization, project: projectId, 'mount-path': mountPath, verbose } = options;

  const domain = options.domain || getDomain();

  if (!domain) {
    return exitWithError(
      `No domain provided, please use --domain option or environment variable REDOCLY_AUTHORIZATION.`
    );
  }

  try {
    const {
      'commit-sha': commitSha,
      'commit-url': commitUrl,
      'default-branch': defaultBranch,
      'wait-for-deployment': waitForDeployment,
      'max-execution-time': maxExecutionTime,
    } = options;
    const author = parseCommitAuthor(options.author);
    const apiKey = getApiKeys();
    const filesToUpload = collectFilesToPush(options.files);
    const commandName = 'push' as const;

    if (!filesToUpload.length) {
      printExecutionTime(commandName, startedAt, `No files to upload`);
      return;
    }

    const client = new ReuniteApi({ domain, apiKey, command: commandName });
    const projectDefaultBranch = await client.remotes.getDefaultBranch(organization, projectId);
    const remote = await client.remotes.upsert(organization, projectId, {
      mountBranchName: projectDefaultBranch,
      mountPath,
    });

    logger.info(
      `Uploading to ${remote.mountPath} ${filesToUpload.length} ${pluralize(
        'file',
        filesToUpload.length
      )}:\n`
    );

    const { id } = await client.remotes.push(
      organization,
      projectId,
      {
        remoteId: remote.id,
        commit: {
          message: options.message,
          branchName: options.branch,
          sha: commitSha,
          url: commitUrl,
          createdAt: options['created-at'],
          namespace: options.namespace,
          repository: options.repository,
          author,
        },
        isMainBranch: defaultBranch === options.branch,
      },
      filesToUpload.map((f) => ({ path: slash(f.name), stream: fs.createReadStream(f.path) }))
    );

    filesToUpload.forEach((f) => {
      logger.info(green(`✓ ${f.name}\n`));
    });

    logger.info('\n');
    logger.info(`Push ID: ${id}\n`);

    if (waitForDeployment) {
      logger.info('\n');

      await pushStatus({
        organization,
        project: projectId,
        pushId: id,
        wait: true,
        domain,
        'max-execution-time': maxExecutionTime,
        'start-time': startTime,
        'continue-on-deploy-failures': options['continue-on-deploy-failures'],
      });
    }
    if (verbose) {
      printExecutionTime(
        commandName,
        startedAt,
        `${pluralize(
          'file',
          filesToUpload.length
        )} uploaded to organization ${organization}, project ${projectId}. Push ID: ${id}.`
      );
    }

    client.reportSunsetWarnings();

    return {
      pushId: id,
    };
  } catch (err) {
    return handleReuniteError('✗ File upload failed.', err);
  }
}

function parseCommitAuthor(author: string): { name: string; email: string } {
  // Author Name <author@email.com>
  const reg = /^.+\s<[^<>]+>$/;

  if (!reg.test(author)) {
    throw new Error('Invalid author format. Use "Author Name <author@email.com>"');
  }

  const [name, email] = author.split('<');

  return {
    name: name.trim(),
    email: email.replace('>', '').trim(),
  };
}

function collectFilesToPush(files: string[]): FileToUpload[] {
  const collectedFiles: Record<string, string> = {};

  for (const file of files) {
    if (fs.statSync(file).isDirectory()) {
      const dir = file;
      const fileList = getFilesList(dir, []);

      fileList.forEach((f) => addFile(f, dir));
    } else {
      addFile(file, path.dirname(file));
    }
  }

  function addFile(filePath: string, fileDir: string) {
    const fileName = path.relative(fileDir, filePath);

    if (collectedFiles[fileName]) {
      logger.warn(`File ${collectedFiles[fileName]} is overwritten by ${filePath}\n`);
    }

    collectedFiles[fileName] = filePath;
  }

  return Object.entries(collectedFiles).map(([name, filePath]) => getFileEntry(name, filePath));
}

function getFileEntry(name: string, filePath: string): FileToUpload {
  return {
    name,
    path: path.resolve(filePath),
  };
}

function getFilesList(dir: string, files: string[]): string[] {
  const filesAndDirs = fs.readdirSync(dir);

  for (const name of filesAndDirs) {
    const currentPath = path.join(dir, name);

    if (fs.statSync(currentPath).isDirectory()) {
      files = getFilesList(currentPath, files);
    } else {
      files.push(currentPath);
    }
  }

  return files;
}
