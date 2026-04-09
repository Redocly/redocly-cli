import { type Async3Definition } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { CHANNELS, OPERATIONS } from '../constants.js';
import { type ChannelsFiles, type ComponentsFiles, type AnyAsyncApiDefinition } from '../types.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import { gatherAsyncApiComponentFiles } from './gather-asyncapi-component-files.js';
import { iterateAsyncApiChannels } from './iterate-asyncapi-channels.js';
import { iterateAsyncApiComponents } from './iterate-asyncapi-components.js';
import { iterateAsyncApiOperations } from './iterate-asyncapi-operations.js';

export function splitAsyncApiDefinition({
  asyncapi,
  asyncapiDir,
  pathSeparator,
  ext,
  specVersion,
}: {
  asyncapi: AnyAsyncApiDefinition;
  asyncapiDir: string;
  pathSeparator: string;
  ext: string;
  specVersion: 'async2' | 'async3';
}) {
  fs.mkdirSync(asyncapiDir, { recursive: true });

  const componentsFiles: ComponentsFiles = {};

  // Phase 1: gather component file paths so replace$Refs can resolve #/components/... when writing channels
  gatherAsyncApiComponentFiles({ asyncapi, asyncapiDir, componentsFiles, ext, specVersion });

  // Phase 2: split channels (componentsFiles is populated → replace$Refs rewrites #/components/... refs)
  const channels = asyncapi.channels;
  const channelsFiles: ChannelsFiles = channels
    ? iterateAsyncApiChannels({
        channels,
        asyncapiDir,
        outDir: path.join(asyncapiDir, CHANNELS),
        componentsFiles,
        pathSeparator,
        ext,
      })
    : {};

  // Phase 3: write component files (channelsFiles is populated → replaceChannelRefs rewrites #/channels/... refs)
  iterateAsyncApiComponents({
    asyncapi,
    asyncapiDir,
    componentsFiles,
    channelsFiles,
    ext,
    specVersion,
  });

  // Phase 4: split operations for AsyncAPI 3
  if (specVersion === 'async3' && (asyncapi as Async3Definition).operations) {
    iterateAsyncApiOperations({
      operations: (asyncapi as Async3Definition).operations!,
      asyncapiDir,
      outDir: path.join(asyncapiDir, OPERATIONS),
      componentsFiles,
      channelsFiles,
      pathSeparator,
      ext,
    });
  }

  replace$Refs(asyncapi, asyncapiDir, componentsFiles);
  writeToFileByExtension(asyncapi, path.join(asyncapiDir, `asyncapi.${ext}`));
}
