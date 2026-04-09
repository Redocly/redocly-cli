import { slash, isRef } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { pathToFilename, writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { type ChannelsFiles, type ComponentsFiles } from '../types.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import {
  traverseDirectoryDeep,
  traverseDirectoryDeepCallback,
} from '../utils/traverse-directory-deep.js';

export function iterateAsyncApiChannels({
  channels,
  asyncapiDir,
  outDir,
  componentsFiles,
  pathSeparator,
  ext,
}: {
  channels: Record<string, any> | undefined;
  asyncapiDir: string;
  outDir: string;
  componentsFiles: ComponentsFiles;
  pathSeparator: string;
  ext: string;
}): ChannelsFiles {
  const channelsFiles: ChannelsFiles = {};
  if (!channels) return channelsFiles;
  fs.mkdirSync(outDir, { recursive: true });

  for (const channelName of Object.keys(channels)) {
    const channelFile = `${path.join(outDir, pathToFilename(channelName, pathSeparator))}.${ext}`;
    const channelData = channels[channelName];

    if (isRef(channelData)) continue;

    channelsFiles[channelName] = channelFile;
    replace$Refs(channelData, path.dirname(channelFile), componentsFiles);
    writeToFileByExtension(channelData, channelFile);
    channels[channelName] = {
      $ref: slash(path.relative(asyncapiDir, channelFile)),
    };

    traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
  }
  return channelsFiles;
}
