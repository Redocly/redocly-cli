import * as fs from 'fs';
import * as path from 'path';
import { Config, BlueHarvestApiClient } from '@redocly/openapi-core';
import * as pluralize from 'pluralize';
import { exitWithError, printExecutionTime } from '../../utils';
import { green } from 'colorette';
import { getDomain } from '../domains';
import { getApiKeys } from '../api-keys';

export type PushOptions = {
  organization?: string;
  project: string;
  mountPath: string;

  branch: string;
  author: string;
  message: string;
  files: string[];

  domain?: string;
  config?: string;
};

type FileToUpload = { path: string };

export async function handlePush(argv: PushOptions, config: Config) {
  const startedAt = performance.now();
  const { organization, project: projectId, mountPath } = argv;

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
    const author = parseCommitAuthor(argv.author);
    const apiKey = getApiKeys(domain);
    const filesToUpload = collectFilesToPush(argv.files);

    if (!filesToUpload.length) {
      return printExecutionTime('push-bh', startedAt, `No files to upload`);
    }

    const client = new BlueHarvestApiClient(domain, apiKey);
    const projectDefaultBranch = await client.remotes.getDefaultBranch(orgId, projectId);
    const remote = await client.remotes.upsert(orgId, projectId, {
      mountBranchName: projectDefaultBranch,
      mountPath,
    });

    process.stdout.write(
      `Uploading ${filesToUpload.length} ${pluralize('file', filesToUpload.length)}:\n\n`
    );

    const { branchName: filesBranch } = await client.remotes.push(
      orgId,
      projectId,
      remote.id,
      {
        commit: {
          message: argv.message,
          author,
          branchName: argv.branch,
        },
      },
      filesToUpload.map((f) => ({ path: f.path, stream: fs.createReadStream(f.path) }))
    );

    filesToUpload.forEach((f) => {
      process.stdout.write(green(`✓ ${path.relative(process.cwd(), f.path)}\n`));
    });

    printExecutionTime(
      'push-bh',
      startedAt,
      `${pluralize(
        'file',
        filesToUpload.length
      )} uploaded to organization ${orgId}, project ${projectId}, branch ${filesBranch}`
    );
  } catch (err) {
    exitWithError(`✗ File upload failed. Reason: ${err.message}\n`);
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
  const collectedFiles = new Set<string>();

  for (const file of files) {
    if (fs.statSync(file).isDirectory()) {
      const fileList = getFilesList(file, []);
      fileList.forEach((f) => collectedFiles.add(f));
    } else {
      collectedFiles.add(file);
    }
  }

  return Array.from(collectedFiles).map((f) => getFileEntry(f));
}

function getFileEntry(filename: string): FileToUpload {
  return {
    path: path.resolve(filename),
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
