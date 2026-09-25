import { slash, isRef } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { pathToFilename, writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { type ChannelsFiles, type ComponentsFiles } from '../types.js';
import { assertWithinDir } from '../utils/assert-within-dir.js';
import { getFileNamePath, type FileNameConflict } from '../utils/get-file-name-path.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import {
  traverseDirectoryDeep,
  traverseDirectoryDeepCallback,
} from '../utils/traverse-directory-deep.js';

export function gatherAsyncApiChannelFiles({
  channels,
  asyncapiDir,
  outDir,
  pathSeparator,
  ext,
  conflicts,
}: {
  channels: Record<string, unknown> | undefined;
  asyncapiDir: string;
  outDir: string;
  pathSeparator: string;
  ext: string;
  conflicts: FileNameConflict[];
}): ChannelsFiles {
  const channelsFiles: ChannelsFiles = {};
  const takenFileNames = new Map<string, string>();
  for (const [channelName, channelData] of Object.entries(channels || {})) {
    if (isRef(channelData)) continue;
    const channelFile = getFileNamePath(
      outDir,
      pathToFilename(channelName, pathSeparator),
      `.${ext}`,
      takenFileNames,
      conflicts
    );
    assertWithinDir(asyncapiDir, channelFile, channelName);
    channelsFiles[channelName] = channelFile;
  }
  return channelsFiles;
}

export function iterateAsyncApiChannels({
  channels,
  channelsFiles,
  asyncapiDir,
  outDir,
  componentsFiles,
}: {
  channels: Record<string, any> | undefined;
  channelsFiles: ChannelsFiles;
  asyncapiDir: string;
  outDir: string;
  componentsFiles: ComponentsFiles;
}) {
  if (!channels) return;
  fs.mkdirSync(outDir, { recursive: true });

  for (const channelName of Object.keys(channels)) {
    const channelData = channels[channelName];

    if (isRef(channelData)) continue;

    const channelFile = channelsFiles[channelName];
    replace$Refs(channelData, path.dirname(channelFile), componentsFiles);
    writeToFileByExtension(channelData, channelFile);
    channels[channelName] = {
      $ref: slash(path.relative(asyncapiDir, channelFile)),
    };

    traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
  }
}
