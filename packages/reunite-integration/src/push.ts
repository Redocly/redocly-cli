import { slash } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ReuniteApi, type SunsetWarning } from './api/index.js';
import type { UpsertRemoteResponse } from './api/types.js';

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
  // Called once the remote exists, right before the files are uploaded to it.
  onUploadStart?: (remote: UpsertRemoteResponse) => void;
  // Called after the push with the most urgent sunset warning the Reunite API sent, if any.
  onSunsetWarning?: (warning: SunsetWarning) => void;
};

export type PushResult = {
  pushId: string;
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
  onUploadStart,
  onSunsetWarning,
}: PushOptions): Promise<PushResult> {
  const client = new ReuniteApi({ domain, apiKey, command: 'push', version });
  const projectDefaultBranch = await client.remotes.getDefaultBranch(organization, project);
  const remote = await client.remotes.upsert(organization, project, {
    mountBranchName: projectDefaultBranch,
    mountPath,
  });

  onUploadStart?.(remote);

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

  const sunsetWarning = client.getSunsetWarning();

  if (sunsetWarning) {
    onSunsetWarning?.(sunsetWarning);
  }

  return { pushId: id };
}

export function collectFilesToPush(
  files: string[],
  // Called when a later path maps to a file name an earlier path already used.
  onFileOverwritten?: (existingPath: string, replacementPath: string) => void
): FileToUpload[] {
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
      onFileOverwritten?.(collectedFiles[fileName], filePath);
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
