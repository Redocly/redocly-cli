import { slash, isRef } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { pathToFilename, writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { type ChannelsFiles, type ComponentsFiles } from '../types.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import { replaceChannelRefs } from '../utils/replace-channel-refs.js';
import {
  traverseDirectoryDeep,
  traverseDirectoryDeepCallback,
} from '../utils/traverse-directory-deep.js';

export function iterateAsyncApiOperations({
  operations,
  asyncapiDir,
  outDir,
  componentsFiles,
  channelsFiles,
  pathSeparator,
  ext,
}: {
  operations: Record<string, any> | undefined;
  asyncapiDir: string;
  outDir: string;
  componentsFiles: ComponentsFiles;
  channelsFiles: ChannelsFiles;
  pathSeparator: string;
  ext: string;
}) {
  if (!operations) return;
  fs.mkdirSync(outDir, { recursive: true });

  for (const operationName of Object.keys(operations)) {
    const operationFile = `${path.join(
      outDir,
      pathToFilename(operationName, pathSeparator)
    )}.${ext}`;
    const operationData = operations[operationName];

    if (isRef(operationData)) continue;

    replace$Refs(operationData, path.dirname(operationFile), componentsFiles);
    replaceChannelRefs(operationData, path.dirname(operationFile), channelsFiles);
    writeToFileByExtension(operationData, operationFile);
    operations[operationName] = {
      $ref: slash(path.relative(asyncapiDir, operationFile)),
    };

    traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
  }
}
