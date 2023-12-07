import * as fs from 'fs';
import * as path from 'path';
import { Config, BlueHarvestApiClient, slash } from '@redocly/openapi-core';
import * as pluralize from 'pluralize';
import { exitWithError, printExecutionTime } from '../../utils';
import { green, yellow } from 'colorette';
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

type FileToUpload = { name: string; path: string };

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
      filesToUpload.map((f) => ({ path: slash(f.name), stream: fs.createReadStream(f.path) }))
    );

    filesToUpload.forEach((f) => {
      process.stdout.write(green(`✓ ${f.name}\n`));
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
