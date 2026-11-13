import { slash, isRef } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { type ChannelsFiles, type ComponentsFiles } from '../types.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import {
  traverseDirectoryDeep,
  traverseDirectoryDeepCallback,
} from '../utils/traverse-directory-deep.js';

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
