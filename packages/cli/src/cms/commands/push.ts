import * as fs from 'fs';
import * as path from 'path';
import { slash } from '@redocly/openapi-core';
import { green, yellow } from 'colorette';
import pluralize = require('pluralize');

import type { OutputFormat, Config } from '@redocly/openapi-core';

import { exitWithError, HandledError, printExecutionTime } from '../../utils/miscellaneous';
import { handlePushStatus } from './push-status';
import { ReuniteApiClient, getDomain, getApiKeys } from '../api';

export type PushOptions = {
  apis?: string[];
  organization?: string;
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

  files: string[];

  'default-branch': string;
  domain?: string;
  config?: string;
  'wait-for-deployment'?: boolean;
  'max-execution-time': number;
  'continue-on-deploy-failures'?: boolean;
  verbose?: boolean;
  format?: Extract<OutputFormat, 'stylish'>;
};

type FileToUpload = { name: string; path: string };

export async function handlePush(
  argv: PushOptions,
  config: Config
): Promise<{ pushId: string } | void> {
  const startedAt = performance.now(); // for printing execution time
  const startTime = Date.now(); // for push-status command

  const { organization, project: projectId, 'mount-path': mountPath, verbose } = argv;

  const orgId = organization || config.organization;

  if (!argv.message || !argv.author || !argv.branch) {
    exitWithError('Error: message, author and branch are required for push to the CMS');
  }

  if (!orgId) {
    return exitWithError(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  }

  const domain = argv.domain || getDomain();

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
    } = argv;
    const author = parseCommitAuthor(argv.author);
    const apiKey = getApiKeys(domain);
    const filesToUpload = collectFilesToPush(argv.files || argv.apis);

    if (!filesToUpload.length) {
      return printExecutionTime('push', startedAt, `No files to upload`);
    }

    const client = new ReuniteApiClient(domain, apiKey);
    const projectDefaultBranch = await client.remotes.getDefaultBranch(orgId, projectId);
    const remote = await client.remotes.upsert(orgId, projectId, {
      mountBranchName: projectDefaultBranch,
      mountPath,
    });

    process.stderr.write(
      `Uploading to ${remote.mountPath} ${filesToUpload.length} ${pluralize(
        'file',
        filesToUpload.length
      )}:\n`
    );

    const { id } = await client.remotes.push(
      orgId,
      projectId,
      {
        remoteId: remote.id,
        commit: {
          message: argv.message,
          branchName: argv.branch,
          sha: commitSha,
          url: commitUrl,
          createdAt: argv['created-at'],
          namespace: argv.namespace,
          repository: argv.repository,
          author,
        },
        isMainBranch: defaultBranch === argv.branch,
      },
      filesToUpload.map((f) => ({ path: slash(f.name), stream: fs.createReadStream(f.path) }))
    );

    filesToUpload.forEach((f) => {
      process.stderr.write(green(`✓ ${f.name}\n`));
    });

    process.stdout.write('\n');
    process.stdout.write(`Push ID: ${id}\n`);

    if (waitForDeployment) {
      process.stdout.write('\n');

      await handlePushStatus(
        {
          organization: orgId,
          project: projectId,
          pushId: id,
          wait: true,
          domain,
          'max-execution-time': maxExecutionTime,
          'start-time': startTime,
          'continue-on-deploy-failures': argv['continue-on-deploy-failures'],
        },
        config
      );
    }
    verbose &&
      printExecutionTime(
        'push',
        startedAt,
        `${pluralize(
          'file',
          filesToUpload.length
        )} uploaded to organization ${orgId}, project ${projectId}. Push ID: ${id}.`
      );

    return {
      pushId: id,
    };
  } catch (err) {
    const message =
      err instanceof HandledError ? '' : `✗ File upload failed. Reason: ${err.message}`;
    exitWithError(message);
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
      process.stdout.write(
        yellow(`File ${collectedFiles[fileName]} is overwritten by ${filePath}\n`)
      );
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
