import { isPlainObject, slash } from '@redocly/openapi-core';
import * as path from 'node:path';

import type { ChannelsFiles } from '../types.js';

export function replaceChannelRefs(
  obj: unknown,
  fromDir: string,
  channelsFiles: ChannelsFiles
): void {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      replaceChannelRefs(item, fromDir, channelsFiles);
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/channels/')) {
      const afterChannels = value.slice('#/channels/'.length);
      const slashIdx = afterChannels.indexOf('/');
      const channelName = slashIdx === -1 ? afterChannels : afterChannels.slice(0, slashIdx);
      const rest = slashIdx === -1 ? '' : afterChannels.slice(slashIdx);
      const channelFile = channelsFiles[channelName];
      if (channelFile) {
        const relative = slash(path.relative(fromDir, channelFile));
        obj[key] = rest ? `${relative}#${rest}` : relative;
      }
    } else {
      replaceChannelRefs(value, fromDir, channelsFiles);
    }
  }
}
