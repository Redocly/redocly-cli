import { logger, slash } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ReuniteApi } from './api/index.js';

export type FileToUpload = { name: string; path: string };

export type PushOptions = {
  domain: string;
  apiKey: string;
  organization: string;
  project: string;
  mountPath: string;
  files: FileToUpload[];
  defaultBranch: string;
  commit: {
    message: string;
    branchName: string;
    author: { name: string; email: string };
    sha?: string;
    url?: string;
    createdAt?: string;
    namespace?: string;
    repository?: string;
  };
  version?: string;
};

export type PushResult = {
  pushId: string;
  mountPath: string;
};

export async function pushFiles({
  domain,
  apiKey,
  organization,
  project,
  mountPath,
  files,
  defaultBranch,
  commit,
  version,
}: PushOptions): Promise<PushResult> {
  const client = new ReuniteApi({ domain, apiKey, command: 'push', version });
  const projectDefaultBranch = await client.remotes.getDefaultBranch(organization, project);
  const remote = await client.remotes.upsert(organization, project, {
    mountBranchName: projectDefaultBranch,
    mountPath,
  });

  const { id } = await client.remotes.push(
    organization,
    project,
    {
      remoteId: remote.id,
      commit,
      isMainBranch: defaultBranch === commit.branchName,
    },
    files.map((file) => ({ path: slash(file.name), stream: fs.createReadStream(file.path) }))
  );

  client.reportSunsetWarnings();

  return { pushId: id, mountPath: remote.mountPath };
}

export function collectFilesToPush(files: string[]): FileToUpload[] {
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

  return Object.entries(collectedFiles).map(([name, filePath]) => ({
    name,
    path: path.resolve(filePath),
  }));
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
